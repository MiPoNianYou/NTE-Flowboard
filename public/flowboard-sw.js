const NOTIFICATION_DB_NAME = 'flowboard-notifications'
const NOTIFICATION_DB_VERSION = 1
const NOTIFICATION_STATE_STORE = 'state'
const NOTIFICATION_STATE_KEY = 'current'
const BACKGROUND_DB_NAME = 'flowboard-background'
const BACKGROUND_DB_VERSION = 1
const BACKGROUND_STATE_STORE = 'sync'
const BACKGROUND_STATE_KEY = 'current'
const CLOUD_SYNC_TAG = 'flowboard-cloud-sync'

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'notification-state') return
  event.waitUntil(saveNotificationState(event.data.state))
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  event.waitUntil(
    Promise.resolve(event.data.json()).then(async (payload) => {
      if (!isValidPayload(payload)) return

      const state = await loadNotificationState()
      if (!shouldShow(payload, state)) return

      const cycles = getVisibleCycles(payload)
      if (payload.notificationType !== 'test' && cycles.length === 0) return

      await self.registration.showNotification(payload.title, {
        body: buildBody(payload, cycles),
        tag: payload.tag,
        renotify: payload.notificationType === 'test',
        data: { url: self.registration.scope },
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.registration.scope))
      if (existing) return existing.focus()
      return clients.openWindow(self.registration.scope)
    }),
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag !== CLOUD_SYNC_TAG) return
  event.waitUntil(processBackgroundSync())
})

async function processBackgroundSync() {
  const state = await loadBackgroundState()
  const pending = state.pending
  if (!pending || pending.status === 'conflict') return

  let result
  try {
    result = await requestConditionalSync(pending)
  } catch (error) {
    if (error?.retryable) throw error
    await saveBackgroundResult(pending, { status: 'error', updatedAt: null })
    return
  }

  await saveBackgroundResult(pending, result)
}

async function requestConditionalSync(pending) {
  const response = await fetch(`${pending.supabaseUrl}/rest/v1/rpc/upsert_sync_if_unchanged`, {
    method: 'POST',
    headers: {
      apikey: pending.publishableKey,
      Authorization: `Bearer ${pending.publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_data: JSON.stringify(pending.data, null, 2),
      p_expected_updated_at: pending.expectedUpdatedAt,
    }),
  })

  if (!response.ok) {
    const error = new Error(`Background sync failed with ${response.status}`)
    error.retryable = response.status === 408 || response.status === 429 || response.status >= 500
    throw error
  }

  const body = await response.json()
  const row = Array.isArray(body) ? body[0] : body
  if (
    !row ||
    !['applied', 'conflict'].includes(row.outcome) ||
    (row.updated_at !== null && typeof row.updated_at !== 'string')
  ) {
    const error = new Error('Background sync returned an invalid response')
    error.retryable = false
    throw error
  }
  return { status: row.outcome, updatedAt: row.updated_at }
}

async function saveBackgroundResult(completed, result) {
  const database = await openBackgroundDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(BACKGROUND_STATE_STORE, 'readwrite')
    const store = transaction.objectStore(BACKGROUND_STATE_STORE)
    const request = store.get(BACKGROUND_STATE_KEY)
    request.onsuccess = () => {
      store.put(
        mergeBackgroundResult(normalizeBackgroundState(request.result), completed, result),
        BACKGROUND_STATE_KEY,
      )
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })

  const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  windows.forEach((client) =>
    client.postMessage({ type: 'flowboard-background-sync-result', result }),
  )
}

function mergeBackgroundResult(state, completed, result) {
  const current = state.pending
  if (!current) return state

  const sameChange = current.id === completed.id
  const sameTarget =
    current.supabaseUrl === completed.supabaseUrl &&
    current.publishableKey === completed.publishableKey
  if (!sameChange && !sameTarget) return state

  if (sameChange) {
    if (result.status === 'applied') state.pending = null
    if (result.status === 'conflict') state.pending = { ...current, status: 'conflict' }
  } else if (result.status === 'applied' && result.updatedAt) {
    state.pending = { ...current, expectedUpdatedAt: result.updatedAt, status: 'pending' }
  } else if (result.status === 'conflict') {
    state.pending = { ...current, status: 'conflict' }
  }

  state.lastResult = {
    status: result.status,
    changeId: completed.id,
    supabaseUrl: completed.supabaseUrl,
    publishableKey: completed.publishableKey,
    updatedAt: result.updatedAt,
    operationVersion: completed.operationVersion,
  }
  return state
}

function normalizeBackgroundState(value) {
  if (!value || typeof value !== 'object') return { pending: null, lastResult: null }
  return {
    pending: value.pending ?? null,
    lastResult: value.lastResult ?? null,
  }
}

function openBackgroundDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKGROUND_DB_NAME, BACKGROUND_DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(BACKGROUND_STATE_STORE)) {
        request.result.createObjectStore(BACKGROUND_STATE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadBackgroundState() {
  const database = await openBackgroundDatabase()
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(BACKGROUND_STATE_STORE)
      .objectStore(BACKGROUND_STATE_STORE)
      .get(BACKGROUND_STATE_KEY)
    request.onsuccess = () => resolve(normalizeBackgroundState(request.result))
    request.onerror = () => reject(request.error)
  })
}

function isValidPayload(payload) {
  return Boolean(
    payload &&
    typeof payload.title === 'string' &&
    typeof payload.body === 'string' &&
    typeof payload.tag === 'string' &&
    typeof payload.expiresAt === 'string' &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.notificationType === 'string' &&
    typeof payload.subscriptionId === 'string' &&
    payload.ruleRevisions &&
    typeof payload.ruleRevisions.beforeReset === 'string' &&
    typeof payload.ruleRevisions.reset === 'string' &&
    Array.isArray(payload.cycles) &&
    !Number.isNaN(Date.parse(payload.issuedAt)),
  )
}

async function shouldShow(payload, state) {
  if (payload.notificationType === 'test') return true
  if (!state.enabled || payload.subscriptionId !== state.subscriptionId) return false

  if (payload.notificationType === 'before-reset') {
    return (
      state.beforeResetEnabled && payload.ruleRevisions.beforeReset === state.beforeResetRevision
    )
  }

  return state.resetEnabled && payload.ruleRevisions.reset === state.resetRevision
}

function getVisibleCycles(payload) {
  const now = Date.now()
  return payload.cycles.filter((cycle) => {
    const expiresAt = payload.cycleExpiresAt?.[cycle] ?? payload.expiresAt
    return Date.parse(expiresAt) > now
  })
}

function buildBody(payload, cycles) {
  if (payload.notificationType === 'test') return payload.body

  const names =
    payload.locale === 'en-US'
      ? { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
      : { daily: '每日', weekly: '每周', monthly: '每月' }
  const values = cycles.map((cycle) => names[cycle])
  if (payload.notificationType === 'before-reset') {
    return payload.locale === 'en-US'
      ? `${joinEnglish(values)} tasks are still incomplete. Finish them before the reset.`
      : `${joinChinese(values)}还有未完成事项，请在重置前完成`
  }
  return payload.locale === 'en-US'
    ? `${joinEnglish(values)} tasks have reset`
    : `${joinChinese(values)}事项已重置`
}

function joinChinese(values) {
  if (values.length <= 1) return values[0] ?? ''
  return values.length === 2
    ? values.join('和')
    : `${values.slice(0, -1).join('、')}和${values[values.length - 1]}`
}

function joinEnglish(values) {
  if (values.length <= 1) return values[0] ?? ''
  return values.length === 2
    ? values.join(' and ')
    : `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

function openNotificationDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_DB_NAME, NOTIFICATION_DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(NOTIFICATION_STATE_STORE)) {
        request.result.createObjectStore(NOTIFICATION_STATE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadNotificationState() {
  try {
    const database = await openNotificationDatabase()
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(NOTIFICATION_STATE_STORE)
        .objectStore(NOTIFICATION_STATE_STORE)
        .get(NOTIFICATION_STATE_KEY)
      request.onsuccess = () => resolve(request.result ?? defaultNotificationState())
      request.onerror = () => reject(request.error)
    })
  } catch {
    return defaultNotificationState()
  }
}

async function saveNotificationState(state) {
  const database = await openNotificationDatabase()
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(NOTIFICATION_STATE_STORE, 'readwrite')
      .objectStore(NOTIFICATION_STATE_STORE)
      .put({ ...defaultNotificationState(), ...state }, NOTIFICATION_STATE_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function defaultNotificationState() {
  return {
    enabled: false,
    beforeResetEnabled: true,
    resetEnabled: true,
    subscriptionId: null,
    beforeResetRevision: '',
    resetRevision: '',
  }
}

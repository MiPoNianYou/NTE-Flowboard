const DB_NAME = 'flowboard-notifications'
const DB_VERSION = 1
const STATE_STORE = 'state'
const STATE_KEY = 'current'

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'notification-state') return
  event.waitUntil(saveState(event.data.state))
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  event.waitUntil(
    Promise.resolve(event.data.json()).then(async (payload) => {
      if (!isValidPayload(payload)) return

      const state = await loadState()
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

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore(STATE_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadState() {
  try {
    const database = await openDatabase()
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STATE_STORE).objectStore(STATE_STORE).get(STATE_KEY)
      request.onsuccess = () => resolve(request.result ?? defaultState())
      request.onerror = () => reject(request.error)
    })
  } catch {
    return defaultState()
  }
}

async function saveState(state) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STATE_STORE, 'readwrite')
      .objectStore(STATE_STORE)
      .put({ ...defaultState(), ...state }, STATE_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function defaultState() {
  return {
    enabled: false,
    beforeResetEnabled: true,
    resetEnabled: true,
    subscriptionId: null,
    beforeResetRevision: '',
    resetRevision: '',
  }
}

import { adminClient, requireUser } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/http.ts'
import { getResetSchedule } from '../_shared/resetCalendar.ts'
import type { Cycle, Locale, NotificationStats, Region } from '../_shared/types.ts'

const CYCLES: Cycle[] = ['daily', 'weekly', 'monthly']
const LEAD_HOURS = [1, 3, 6, 12]

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)

  try {
    const user = await requireUser(request)
    const body = await request.json()
    if (body.action === 'delete') {
      const { error } = await adminClient
        .from('notification_subscriptions')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
      return jsonResponse({ ok: true })
    }
    if (body.action !== 'upsert') return jsonResponse({ error: 'INVALID_ACTION' }, 400)

    const subscription = parseSubscription(body.subscription)
    const region = parseRegion(body.serverRegion)
    const locale = parseLocale(body.locale)
    const preferences = parsePreferences(body.preferences)
    const revisions = parseRevisions(body.revisions)
    const stats = normalizeStats(body.stats, region, new Date())

    const { error: endpointConflictError } = await adminClient
      .from('notification_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)
      .neq('user_id', user.id)
    if (endpointConflictError) throw endpointConflictError

    const row: Record<string, unknown> = {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      server_region: region,
      locale,
      before_reset_revision: revisions.beforeReset,
      reset_revision: revisions.reset,
      before_reset_enabled: preferences.beforeResetEnabled,
      reset_enabled: preferences.resetEnabled,
      lead_hours: preferences.leadHours,
    }
    for (const cycle of CYCLES) {
      row[`${cycle}_visible_total`] = stats[cycle].visibleTotal
      row[`${cycle}_incomplete`] = stats[cycle].incomplete
      row[`${cycle}_cycle_started_at`] = stats[cycle].cycleStartedAt
    }

    const { error } = await adminClient
      .from('notification_subscriptions')
      .upsert(row, { onConflict: 'user_id' })
    if (error) throw error
    return jsonResponse({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return jsonResponse({ error: message }, message === 'AUTH_REQUIRED' ? 401 : 400)
  }
})

function parseSubscription(value: unknown) {
  const subscription = value as Record<string, unknown>
  const keys = subscription?.keys as Record<string, unknown>
  if (
    typeof subscription?.endpoint !== 'string' ||
    !subscription.endpoint.startsWith('https://') ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys.auth !== 'string'
  ) {
    throw new Error('INVALID_SUBSCRIPTION')
  }
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  }
}

function parseRegion(value: unknown): Region {
  if (value === 'asia' || value === 'america' || value === 'europe') return value
  throw new Error('INVALID_REGION')
}

function parseLocale(value: unknown): Locale {
  if (value === 'zh-CN' || value === 'en-US') return value
  throw new Error('INVALID_LOCALE')
}

function parsePreferences(value: unknown) {
  const preferences = value as Record<string, unknown>
  if (
    typeof preferences?.beforeResetEnabled !== 'boolean' ||
    typeof preferences.resetEnabled !== 'boolean' ||
    !LEAD_HOURS.includes(Number(preferences.leadHours))
  ) {
    throw new Error('INVALID_PREFERENCES')
  }
  return {
    beforeResetEnabled: preferences.beforeResetEnabled,
    resetEnabled: preferences.resetEnabled,
    leadHours: Number(preferences.leadHours),
  }
}

function parseRevisions(value: unknown) {
  const revisions = value as Record<string, unknown>
  if (!isUuid(revisions?.beforeReset) || !isUuid(revisions?.reset)) {
    throw new Error('INVALID_REVISIONS')
  }
  return { beforeReset: revisions.beforeReset as string, reset: revisions.reset as string }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function normalizeStats(value: unknown, region: Region, now: Date): NotificationStats {
  const input = value as Record<string, Record<string, unknown>>
  return Object.fromEntries(
    CYCLES.map((cycle) => {
      const visibleTotal = parseCount(input?.[cycle]?.visibleTotal)
      const incomplete = Math.min(visibleTotal, parseCount(input?.[cycle]?.incomplete))
      const expectedCycle = getResetSchedule(cycle, region, now).previousResetAt.toISOString()
      return [
        cycle,
        {
          visibleTotal,
          incomplete: input?.[cycle]?.cycleStartedAt === expectedCycle ? incomplete : visibleTotal,
          cycleStartedAt: expectedCycle,
        },
      ]
    }),
  ) as NotificationStats
}

function parseCount(value: unknown): number {
  const count = Number(value)
  if (!Number.isInteger(count) || count < 0 || count > 10_000) throw new Error('INVALID_STATS')
  return count
}

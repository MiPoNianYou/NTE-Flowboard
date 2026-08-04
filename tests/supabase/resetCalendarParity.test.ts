import { describe, expect, it } from 'vitest'
import { getResetSchedule as getClientResetSchedule } from '../../src/utils/resetCalendar'
import { getResetSchedule as getDispatchResetSchedule } from '../../supabase/functions/_shared/resetCalendar'
import type { ChecklistCycle, ServerRegion } from '../../src/types'

const cases: Array<{ cycle: ChecklistCycle; region: ServerRegion; now: string }> = [
  { cycle: 'daily', region: 'asia', now: '2026-07-13T20:59:00.000Z' },
  { cycle: 'weekly', region: 'asia', now: '2026-07-12T21:00:00.000Z' },
  { cycle: 'monthly', region: 'asia', now: '2026-07-31T20:59:00.000Z' },
  { cycle: 'daily', region: 'america', now: '2026-03-08T08:59:00.000Z' },
  { cycle: 'weekly', region: 'america', now: '2026-11-02T09:30:00.000Z' },
  { cycle: 'daily', region: 'europe', now: '2026-03-29T02:59:00.000Z' },
  { cycle: 'daily', region: 'europe', now: '2026-10-25T03:59:00.000Z' },
]

describe('notification reset calendar parity', () => {
  it.each(cases)('keeps $cycle/$region aligned at $now', ({ cycle, region, now }) => {
    const instant = new Date(now)
    const client = getClientResetSchedule(cycle, region, instant)
    const dispatch = getDispatchResetSchedule(cycle, region, instant)

    expect(dispatch.previousResetAt.toISOString()).toBe(client.previousResetAt.toISOString())
    expect(dispatch.nextResetAt.toISOString()).toBe(client.nextResetAt.toISOString())
  })
})

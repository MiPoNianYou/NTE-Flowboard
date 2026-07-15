import { describe, expect, it } from 'vitest'
import { getResetSchedule, isResetDue } from '../../utils/resetCalendar'
import type { ChecklistCycle, ServerRegion } from '../../types'

interface ScheduleCase {
  name: string
  cycle: ChecklistCycle
  region: ServerRegion
  now: string
  previousResetAt: string
  nextResetAt: string
}

const scheduleCases: ScheduleCase[] = [
  {
    name: 'daily Asia immediately before 05:00',
    cycle: 'daily',
    region: 'asia',
    now: '2026-07-13T20:59:00.000Z',
    previousResetAt: '2026-07-12T21:00:00.000Z',
    nextResetAt: '2026-07-13T21:00:00.000Z',
  },
  {
    name: 'weekly Asia immediately before Monday 05:00',
    cycle: 'weekly',
    region: 'asia',
    now: '2026-07-12T20:59:00.000Z',
    previousResetAt: '2026-07-05T21:00:00.000Z',
    nextResetAt: '2026-07-12T21:00:00.000Z',
  },
  {
    name: 'monthly Asia immediately before the first-day 05:00',
    cycle: 'monthly',
    region: 'asia',
    now: '2026-07-31T20:59:00.000Z',
    previousResetAt: '2026-06-30T21:00:00.000Z',
    nextResetAt: '2026-07-31T21:00:00.000Z',
  },
  {
    name: 'daily America across spring DST',
    cycle: 'daily',
    region: 'america',
    now: '2026-03-08T08:59:00.000Z',
    previousResetAt: '2026-03-07T10:00:00.000Z',
    nextResetAt: '2026-03-08T09:00:00.000Z',
  },
  {
    name: 'weekly America after autumn DST',
    cycle: 'weekly',
    region: 'america',
    now: '2026-11-02T09:30:00.000Z',
    previousResetAt: '2026-10-26T09:00:00.000Z',
    nextResetAt: '2026-11-02T10:00:00.000Z',
  },
  {
    name: 'daily Europe across spring DST',
    cycle: 'daily',
    region: 'europe',
    now: '2026-03-29T02:59:00.000Z',
    previousResetAt: '2026-03-28T04:00:00.000Z',
    nextResetAt: '2026-03-29T03:00:00.000Z',
  },
  {
    name: 'daily Europe across autumn DST',
    cycle: 'daily',
    region: 'europe',
    now: '2026-10-25T03:59:00.000Z',
    previousResetAt: '2026-10-24T03:00:00.000Z',
    nextResetAt: '2026-10-25T04:00:00.000Z',
  },
]

describe('getResetSchedule', () => {
  it.each(scheduleCases)(
    '$name returns the surrounding scheduled reset instants',
    ({ cycle, region, now, previousResetAt, nextResetAt }) => {
      const schedule = getResetSchedule(cycle, region, new Date(now))

      expect(schedule.previousResetAt.toISOString()).toBe(previousResetAt)
      expect(schedule.nextResetAt.toISOString()).toBe(nextResetAt)
    },
  )

  it('moves the previous reset to the current instant at an exact 05:00 boundary', () => {
    const schedule = getResetSchedule('daily', 'asia', new Date('2026-07-13T21:00:00.000Z'))

    expect(schedule.previousResetAt.toISOString()).toBe('2026-07-13T21:00:00.000Z')
    expect(schedule.nextResetAt.toISOString()).toBe('2026-07-14T21:00:00.000Z')
  })
})

describe('isResetDue', () => {
  it('uses the previous scheduled reset instant as the due threshold', () => {
    const schedule = getResetSchedule('daily', 'america', new Date('2026-03-08T08:59:00.000Z'))

    expect(isResetDue('2026-03-07T09:59:59.999Z', schedule)).toBe(true)
    expect(isResetDue('2026-03-07T10:00:00.000Z', schedule)).toBe(false)
  })

  it('keeps countdown duration aligned with the scheduled instant across spring DST', () => {
    const now = new Date('2026-03-08T08:00:00.000Z')
    const schedule = getResetSchedule('daily', 'america', now)

    expect(schedule.nextResetAt.getTime() - now.getTime()).toBe(60 * 60 * 1000)
  })

  it('keeps countdown duration aligned with the scheduled instant across autumn DST', () => {
    const now = new Date('2026-10-25T03:00:00.000Z')
    const schedule = getResetSchedule('daily', 'europe', now)

    expect(schedule.nextResetAt.getTime() - now.getTime()).toBe(60 * 60 * 1000)
  })
})

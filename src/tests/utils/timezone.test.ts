import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isUSDST,
  isEUDST,
  getServerUTCOffset,
  shouldResetDaily,
  shouldResetWeekly,
  shouldResetMonthly,
} from '../../utils/timezone'

function utc(iso: string) {
  return new Date(iso)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('isUSDST', () => {
  it('returns true during US summer (July)', () => {
    expect(isUSDST(utc('2026-07-01T12:00:00Z'))).toBe(true)
  })

  it('returns false during US winter (January)', () => {
    expect(isUSDST(utc('2026-01-15T12:00:00Z'))).toBe(false)
  })

  it('returns false just before DST starts (2026-03-08 06:59 UTC)', () => {
    expect(isUSDST(utc('2026-03-08T06:59:00Z'))).toBe(false)
  })

  it('returns true at DST start (2026-03-08 07:00 UTC)', () => {
    expect(isUSDST(utc('2026-03-08T07:00:00Z'))).toBe(true)
  })

  it('returns true just before DST ends (2026-11-01 05:59 UTC)', () => {
    expect(isUSDST(utc('2026-11-01T05:59:00Z'))).toBe(true)
  })

  it('returns false at DST end (2026-11-01 06:00 UTC)', () => {
    expect(isUSDST(utc('2026-11-01T06:00:00Z'))).toBe(false)
  })
})

describe('isEUDST', () => {
  it('returns true during EU summer (July)', () => {
    expect(isEUDST(utc('2026-07-01T12:00:00Z'))).toBe(true)
  })

  it('returns false during EU winter (January)', () => {
    expect(isEUDST(utc('2026-01-15T12:00:00Z'))).toBe(false)
  })

  it('returns false just before DST starts (2026-03-29 00:59 UTC)', () => {
    expect(isEUDST(utc('2026-03-29T00:59:00Z'))).toBe(false)
  })

  it('returns true at EU DST start (2026-03-29 01:00 UTC)', () => {
    expect(isEUDST(utc('2026-03-29T01:00:00Z'))).toBe(true)
  })

  it('returns false at EU DST end (2026-10-25 01:00 UTC)', () => {
    expect(isEUDST(utc('2026-10-25T01:00:00Z'))).toBe(false)
  })
})

describe('getServerUTCOffset', () => {
  it('asia is always UTC+8', () => {
    expect(getServerUTCOffset('asia', utc('2026-07-01T00:00:00Z'))).toBe(8)
    expect(getServerUTCOffset('asia', utc('2026-01-01T00:00:00Z'))).toBe(8)
  })

  it('america returns -4 during DST and -5 otherwise', () => {
    expect(getServerUTCOffset('america', utc('2026-07-01T12:00:00Z'))).toBe(-4)
    expect(getServerUTCOffset('america', utc('2026-01-15T12:00:00Z'))).toBe(-5)
  })

  it('europe returns +2 during DST and +1 otherwise', () => {
    expect(getServerUTCOffset('europe', utc('2026-07-01T12:00:00Z'))).toBe(2)
    expect(getServerUTCOffset('europe', utc('2026-01-15T12:00:00Z'))).toBe(1)
  })
})

describe('reset boundaries', () => {
  it('resets daily at 05:00 in Asia', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-07-13T20:59:00Z'))
    expect(shouldResetDaily('2026-07-12T21:00:00Z', 'asia')).toBe(false)

    vi.setSystemTime(utc('2026-07-13T21:00:00Z'))
    expect(shouldResetDaily('2026-07-13T20:59:00Z', 'asia')).toBe(true)
  })

  it('resets weekly at Monday 05:00 in Asia', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-07-12T20:59:00Z'))
    expect(shouldResetWeekly('2026-07-05T21:00:00Z', 'asia')).toBe(false)

    vi.setSystemTime(utc('2026-07-12T21:00:00Z'))
    expect(shouldResetWeekly('2026-07-12T20:59:00Z', 'asia')).toBe(true)
  })

  it('resets monthly on day one at 05:00 in Asia', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-07-31T20:59:00Z'))
    expect(shouldResetMonthly('2026-06-30T21:00:00Z', 'asia')).toBe(false)

    vi.setSystemTime(utc('2026-07-31T21:00:00Z'))
    expect(shouldResetMonthly('2026-07-31T20:59:00Z', 'asia')).toBe(true)
  })

  it('uses the American DST offset at its reset boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-03-08T08:59:00Z'))
    expect(shouldResetDaily('2026-03-07T10:00:00Z', 'america')).toBe(false)

    vi.setSystemTime(utc('2026-03-08T09:00:00Z'))
    expect(shouldResetDaily('2026-03-08T08:59:00Z', 'america')).toBe(true)
  })

  it('uses the European DST offset at its reset boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-03-29T02:59:00Z'))
    expect(shouldResetDaily('2026-03-28T04:00:00Z', 'europe')).toBe(false)

    vi.setSystemTime(utc('2026-03-29T03:00:00Z'))
    expect(shouldResetDaily('2026-03-29T02:59:00Z', 'europe')).toBe(true)
  })

  it('does not reset weekly before the American fall-back boundary has passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-11-01T09:30:00Z'))

    expect(shouldResetWeekly('2026-10-26T09:30:00Z', 'america')).toBe(false)
  })

  it('resets monthly when its American pre-DST boundary has passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(utc('2026-03-15T12:00:00Z'))

    expect(shouldResetMonthly('2026-03-01T09:30:00Z', 'america')).toBe(true)
  })
})

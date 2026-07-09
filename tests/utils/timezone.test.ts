import { describe, it, expect } from 'vitest'
import { isUSDST, isEUDST, getServerUTCOffset } from '../../src/utils/timezone'

// 测试用 Date 构造辅助：直接传 ISO 字符串，确保时区无关
function utc(iso: string) {
  return new Date(iso)
}

describe('isUSDST', () => {
  it('returns true during US summer (July)', () => {
    expect(isUSDST(utc('2026-07-01T12:00:00Z'))).toBe(true)
  })

  it('returns false during US winter (January)', () => {
    expect(isUSDST(utc('2026-01-15T12:00:00Z'))).toBe(false)
  })

  it('returns false just before DST starts (2026-03-08 06:59 UTC)', () => {
    // 2026: March 8 is the second Sunday; DST starts at 07:00 UTC
    expect(isUSDST(utc('2026-03-08T06:59:00Z'))).toBe(false)
  })

  it('returns true at DST start (2026-03-08 07:00 UTC)', () => {
    expect(isUSDST(utc('2026-03-08T07:00:00Z'))).toBe(true)
  })

  it('returns true just before DST ends (2026-11-01 05:59 UTC)', () => {
    // 2026: November 1 is the first Sunday; DST ends at 06:00 UTC
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
    // 2026: March 29 is last Sunday of March; EU DST starts at 01:00 UTC
    expect(isEUDST(utc('2026-03-29T00:59:00Z'))).toBe(false)
  })

  it('returns true at EU DST start (2026-03-29 01:00 UTC)', () => {
    expect(isEUDST(utc('2026-03-29T01:00:00Z'))).toBe(true)
  })

  it('returns false at EU DST end (2026-10-25 01:00 UTC)', () => {
    // 2026: October 25 is last Sunday of October
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

import type { ServerRegion } from '../types'
import { RESET_HOUR } from './constants'

export function isUSDST(date: Date): boolean {
  const year = date.getFullYear()

  const march1 = new Date(year, 2, 1)
  const march1stSun = march1.getDay() === 0 ? 1 : 7 - march1.getDay() + 1
  const dstStart = new Date(Date.UTC(year, 2, march1stSun + 7, 7, 0, 0))

  const november1 = new Date(year, 10, 1)
  const nov1stSun = november1.getDay() === 0 ? 1 : 7 - november1.getDay() + 1
  const dstEnd = new Date(Date.UTC(year, 10, nov1stSun, 6, 0, 0))

  return date.getTime() >= dstStart.getTime() && date.getTime() < dstEnd.getTime()
}

export function isEUDST(date: Date): boolean {
  const year = date.getFullYear()

  const march31 = new Date(year, 2, 31)
  const marchLastSun = 31 - march31.getDay()
  const dstStart = new Date(Date.UTC(year, 2, marchLastSun, 1, 0, 0))

  const october31 = new Date(year, 9, 31)
  const octLastSun = 31 - october31.getDay()
  const dstEnd = new Date(Date.UTC(year, 9, octLastSun, 1, 0, 0))

  return date.getTime() >= dstStart.getTime() && date.getTime() < dstEnd.getTime()
}

export function getServerUTCOffset(region: ServerRegion, date: Date = new Date()): number {
  switch (region) {
    case 'asia':
      return 8
    case 'america':
      return isUSDST(date) ? -4 : -5
    case 'europe':
      return isEUDST(date) ? 2 : 1
  }
}

export function getServerDate(region: ServerRegion): Date {
  const now = new Date()
  return new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + getServerUTCOffset(region, now) * 3600000,
  )
}

export function serverTimeToUTC(localTime: Date, region: ServerRegion): Date {
  return zonedTimeToUTC(
    localTime.getUTCFullYear(),
    localTime.getUTCMonth(),
    localTime.getUTCDate(),
    localTime.getUTCHours(),
    region,
  )
}

export function shouldResetDaily(lastDailyReset: string, serverRegion: ServerRegion): boolean {
  const now = zonedParts(new Date(), serverRegion)
  const resetDate = new Date(now.timestamp)
  if (now.hour < RESET_HOUR) resetDate.setUTCDate(resetDate.getUTCDate() - 1)
  return (
    new Date(lastDailyReset) <
    zonedTimeToUTC(
      resetDate.getUTCFullYear(),
      resetDate.getUTCMonth(),
      resetDate.getUTCDate(),
      RESET_HOUR,
      serverRegion,
    )
  )
}

export function shouldResetWeekly(lastWeeklyReset: string, serverRegion: ServerRegion): boolean {
  const now = zonedParts(new Date(), serverRegion)
  const resetDate = new Date(now.timestamp)
  const daysSinceMonday = (now.weekday + 6) % 7
  resetDate.setUTCDate(resetDate.getUTCDate() - daysSinceMonday)
  if (now.weekday === 1 && now.hour < RESET_HOUR) resetDate.setUTCDate(resetDate.getUTCDate() - 7)
  return (
    new Date(lastWeeklyReset) <
    zonedTimeToUTC(
      resetDate.getUTCFullYear(),
      resetDate.getUTCMonth(),
      resetDate.getUTCDate(),
      RESET_HOUR,
      serverRegion,
    )
  )
}

export function shouldResetMonthly(lastMonthlyReset: string, serverRegion: ServerRegion): boolean {
  const now = zonedParts(new Date(), serverRegion)
  const resetDate = new Date(Date.UTC(now.year, now.month, 1))
  if (now.day === 1 && now.hour < RESET_HOUR) resetDate.setUTCMonth(resetDate.getUTCMonth() - 1)
  return (
    new Date(lastMonthlyReset) <
    zonedTimeToUTC(
      resetDate.getUTCFullYear(),
      resetDate.getUTCMonth(),
      resetDate.getUTCDate(),
      RESET_HOUR,
      serverRegion,
    )
  )
}

const TIME_ZONES: Record<ServerRegion, string> = {
  asia: 'Asia/Shanghai',
  america: 'America/New_York',
  europe: 'Europe/Berlin',
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  weekday: number
  timestamp: number
}

function zonedParts(date: Date, region: ServerRegion): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONES[region],
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const year = value('year')
  const month = value('month') - 1
  const day = value('day')
  const hour = value('hour')
  return {
    year,
    month,
    day,
    hour,
    weekday: weekdays.indexOf(parts.find((part) => part.type === 'weekday')?.value ?? ''),
    timestamp: Date.UTC(year, month, day, hour),
  }
}

function zonedTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  region: ServerRegion,
): Date {
  const localTimestamp = Date.UTC(year, month, day, hour)
  let utcTimestamp = localTimestamp
  for (let attempt = 0; attempt < 2; attempt += 1) {
    utcTimestamp += localTimestamp - zonedParts(new Date(utcTimestamp), region).timestamp
  }
  return new Date(utcTimestamp)
}

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
  const offset = getServerUTCOffset(region)
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + offset * 3600000)
}

export function serverTimeToUTC(localTime: Date, region: ServerRegion): Date {
  const offset = getServerUTCOffset(region)
  const now = new Date()
  return new Date(localTime.getTime() - (offset * 3600000 + now.getTimezoneOffset() * 60000))
}

export function shouldResetDaily(lastDailyReset: string, serverRegion: ServerRegion): boolean {
  const now = getServerDate(serverRegion)
  const last = new Date(lastDailyReset)

  const todayReset = new Date(now)
  todayReset.setHours(RESET_HOUR, 0, 0, 0)
  if (now < todayReset) todayReset.setDate(todayReset.getDate() - 1)

  return last < serverTimeToUTC(todayReset, serverRegion)
}

export function shouldResetWeekly(lastWeeklyReset: string, serverRegion: ServerRegion): boolean {
  const now = getServerDate(serverRegion)
  const last = new Date(lastWeeklyReset)
  const resetDay = 1

  const thisWeekReset = new Date(now)
  const currentDay = now.getDay()
  let dayDiff = currentDay - resetDay
  if (dayDiff < 0) dayDiff += 7
  thisWeekReset.setDate(now.getDate() - dayDiff)
  thisWeekReset.setHours(RESET_HOUR, 0, 0, 0)
  if (now < thisWeekReset) thisWeekReset.setDate(thisWeekReset.getDate() - 7)

  return last < serverTimeToUTC(thisWeekReset, serverRegion)
}

export function shouldResetMonthly(lastMonthlyReset: string, serverRegion: ServerRegion): boolean {
  const now = getServerDate(serverRegion)
  const last = new Date(lastMonthlyReset)

  const thisMonthReset = new Date(now)
  thisMonthReset.setDate(1)
  thisMonthReset.setHours(RESET_HOUR, 0, 0, 0)
  if (now < thisMonthReset) thisMonthReset.setMonth(thisMonthReset.getMonth() - 1)

  return last < serverTimeToUTC(thisMonthReset, serverRegion)
}

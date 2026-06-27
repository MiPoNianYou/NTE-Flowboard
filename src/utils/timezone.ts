import type { ServerRegion } from '../types'
import { RESET_HOUR } from './constants'

/**
 * 检查给定日期是否在美国夏令时期间。
 * 夏令时开始：3 月第二个周日 2:00 AM
 * 夏令时结束：11 月第一个周日 2:00 AM
 */
export function isUSDST(date: Date): boolean {
  const year = date.getFullYear()

  const march1 = new Date(year, 2, 1)
  const march1stSun = march1.getDay() === 0 ? 1 : 7 - march1.getDay() + 1
  const dstStart = new Date(year, 2, march1stSun + 7, 2, 0, 0)

  const november1 = new Date(year, 10, 1)
  const nov1stSun = november1.getDay() === 0 ? 1 : 7 - november1.getDay() + 1
  const dstEnd = new Date(year, 10, nov1stSun, 2, 0, 0)

  return date >= dstStart && date < dstEnd
}

/**
 * 检查给定日期是否在欧洲夏令时期间。
 * 夏令时开始：3 月最后一个周日 1:00 AM UTC
 * 夏令时结束：10 月最后一个周日 1:00 AM UTC
 */
export function isEUDST(date: Date): boolean {
  const year = date.getFullYear()

  const march31 = new Date(year, 2, 31)
  const marchLastSun = 31 - march31.getDay()
  const dstStart = new Date(Date.UTC(year, 2, marchLastSun, 1, 0, 0))

  const october31 = new Date(year, 9, 31)
  const octLastSun = 31 - october31.getDay()
  const dstEnd = new Date(Date.UTC(year, 9, octLastSun, 1, 0, 0))

  const nowUTC = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  )
  return nowUTC >= dstStart.getTime() && nowUTC < dstEnd.getTime()
}

/**
 * 获取服务器区域的当前 UTC 偏移量。
 * @param region - 服务器区域
 * @param date - 要检查的日期（默认为当前时间）
 * @returns UTC 偏移量（小时）
 */
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

/**
 * 获取根据服务器区域时区调整后的当前日期/时间。
 */
export function getServerDate(region: ServerRegion): Date {
  const offset = getServerUTCOffset(region)
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + offset * 3600000)
}

/** 将服务器时区的本地时间转换回 UTC Date，以便与 ISO 时间戳比较 */
export function serverTimeToUTC(localTime: Date, region: ServerRegion): Date {
  const offset = getServerUTCOffset(region)
  const now = new Date()
  return new Date(localTime.getTime() - (offset * 3600000 + now.getTimezoneOffset() * 60000))
}

/**
 * 检查是否应触发每日重置。
 * 重置时间固定为服务器时区的 RESET_HOUR:00 AM。
 */
export function shouldResetDaily(lastDailyReset: string, serverRegion: ServerRegion): boolean {
  const now = getServerDate(serverRegion)
  const last = new Date(lastDailyReset)

  const todayReset = new Date(now)
  todayReset.setHours(RESET_HOUR, 0, 0, 0)
  if (now < todayReset) todayReset.setDate(todayReset.getDate() - 1)

  return last < serverTimeToUTC(todayReset, serverRegion)
}

/**
 * 检查是否应触发每周重置。
 * 重置时间固定为服务器时区的周一 RESET_HOUR:00 AM。
 */
export function shouldResetWeekly(lastWeeklyReset: string, serverRegion: ServerRegion): boolean {
  const now = getServerDate(serverRegion)
  const last = new Date(lastWeeklyReset)
  const resetDay = 1 // 周一

  const thisWeekReset = new Date(now)
  const currentDay = now.getDay()
  let dayDiff = currentDay - resetDay
  if (dayDiff < 0) dayDiff += 7
  thisWeekReset.setDate(now.getDate() - dayDiff)
  thisWeekReset.setHours(RESET_HOUR, 0, 0, 0)
  if (now < thisWeekReset) thisWeekReset.setDate(thisWeekReset.getDate() - 7)

  return last < serverTimeToUTC(thisWeekReset, serverRegion)
}

/**
 * 检查是否应触发每月重置。
 * 重置时间固定为服务器时区的每月 1 日 RESET_HOUR:00 AM。
 */
export function shouldResetMonthly(lastMonthlyReset: string, serverRegion: ServerRegion): boolean {
  const now = getServerDate(serverRegion)
  const last = new Date(lastMonthlyReset)

  const thisMonthReset = new Date(now)
  thisMonthReset.setDate(1)
  thisMonthReset.setHours(RESET_HOUR, 0, 0, 0)
  if (now < thisMonthReset) thisMonthReset.setMonth(thisMonthReset.getMonth() - 1)

  return last < serverTimeToUTC(thisMonthReset, serverRegion)
}

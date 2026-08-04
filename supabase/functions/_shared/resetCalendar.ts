import type { Cycle, Region } from './types.ts'

const RESET_HOUR = 5
const TIME_ZONES: Record<Region, string> = {
  asia: 'Asia/Shanghai',
  america: 'America/New_York',
  europe: 'Europe/Berlin',
}

interface ZonedParts {
  year: number
  month: number
  day: number
  weekday: number
}

export function getResetSchedule(cycle: Cycle, region: Region, now: Date) {
  const parts = zonedParts(now, region)
  const previousDate = scheduledResetDate(cycle, parts, now, region)
  const previousResetAt = zonedTimeToUTC(previousDate, region)
  const nextDate = new Date(previousDate)
  if (cycle === 'daily') nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  if (cycle === 'weekly') nextDate.setUTCDate(nextDate.getUTCDate() + 7)
  if (cycle === 'monthly') nextDate.setUTCMonth(nextDate.getUTCMonth() + 1)
  return { previousResetAt, nextResetAt: zonedTimeToUTC(nextDate, region) }
}

function scheduledResetDate(cycle: Cycle, parts: ZonedParts, now: Date, region: Region): Date {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day, RESET_HOUR))
  if (cycle === 'weekly') date.setUTCDate(date.getUTCDate() - ((parts.weekday + 6) % 7))
  if (cycle === 'monthly') date.setUTCDate(1)

  if (now < zonedTimeToUTC(date, region)) {
    if (cycle === 'daily') date.setUTCDate(date.getUTCDate() - 1)
    if (cycle === 'weekly') date.setUTCDate(date.getUTCDate() - 7)
    if (cycle === 'monthly') date.setUTCMonth(date.getUTCMonth() - 1)
  }
  return date
}

function zonedParts(date: Date, region: Region): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONES[region],
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    year: value('year'),
    month: value('month') - 1,
    day: value('day'),
    weekday: weekdays.indexOf(parts.find((part) => part.type === 'weekday')?.value ?? ''),
  }
}

function zonedTimeToUTC(date: Date, region: Region): Date {
  const localTimestamp = date.getTime()
  let utcTimestamp = localTimestamp
  for (let attempt = 0; attempt < 2; attempt += 1) {
    utcTimestamp += localTimestamp - zonedTimestamp(new Date(utcTimestamp), region)
  }
  return new Date(utcTimestamp)
}

function zonedTimestamp(date: Date, region: Region): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONES[region],
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'))
}

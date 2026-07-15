import type { ChecklistCycle, ResetSchedule, ServerRegion } from '../types'
import { RESET_HOUR } from './constants'

const TIME_ZONES: Record<ServerRegion, string> = {
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

/**
 * Returns the scheduled reset instants immediately before and after `now` for one Checklist Cycle.
 * The calculation uses the server region's IANA timezone, not the browser timezone.
 */
export function getResetSchedule(
  cycle: ChecklistCycle,
  serverRegion: ServerRegion,
  now: Date,
): ResetSchedule {
  const parts = zonedParts(now, serverRegion)
  const previousResetDate = scheduledResetDate(cycle, parts, now, serverRegion)
  const previousResetAt = zonedTimeToUTC(previousResetDate, serverRegion)
  const nextResetDate = advanceResetDate(previousResetDate, cycle)

  return {
    previousResetAt,
    nextResetAt: zonedTimeToUTC(nextResetDate, serverRegion),
  }
}

export function isResetDue(lastResetAt: string, schedule: ResetSchedule): boolean {
  return new Date(lastResetAt) < schedule.previousResetAt
}

function scheduledResetDate(
  cycle: ChecklistCycle,
  parts: ZonedParts,
  now: Date,
  serverRegion: ServerRegion,
): Date {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day, RESET_HOUR))

  if (cycle === 'weekly') {
    date.setUTCDate(date.getUTCDate() - ((parts.weekday + 6) % 7))
  }
  if (cycle === 'monthly') {
    date.setUTCDate(1)
  }

  if (now < zonedTimeToUTC(date, serverRegion)) {
    if (cycle === 'daily') date.setUTCDate(date.getUTCDate() - 1)
    if (cycle === 'weekly') date.setUTCDate(date.getUTCDate() - 7)
    if (cycle === 'monthly') date.setUTCMonth(date.getUTCMonth() - 1)
  }

  return date
}

function advanceResetDate(date: Date, cycle: ChecklistCycle): Date {
  const next = new Date(date)
  if (cycle === 'daily') next.setUTCDate(next.getUTCDate() + 1)
  if (cycle === 'weekly') next.setUTCDate(next.getUTCDate() + 7)
  if (cycle === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

function zonedParts(date: Date, serverRegion: ServerRegion): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONES[serverRegion],
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

function zonedTimeToUTC(date: Date, serverRegion: ServerRegion): Date {
  const localTimestamp = date.getTime()
  let utcTimestamp = localTimestamp

  for (let attempt = 0; attempt < 2; attempt += 1) {
    utcTimestamp += localTimestamp - zonedTimestamp(new Date(utcTimestamp), serverRegion)
  }

  return new Date(utcTimestamp)
}

function zonedTimestamp(date: Date, serverRegion: ServerRegion): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONES[serverRegion],
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

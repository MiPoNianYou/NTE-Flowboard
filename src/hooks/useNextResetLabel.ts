import { useState, useMemo } from 'react'
import type { TabType, ServerRegion } from '../types'
import { MS, RESET_HOUR } from '../utils/constants'
import { getServerUTCOffset } from '../utils/timezone'
import { useVisibilityInterval } from './useVisibilityInterval'

interface UseNextResetLabelProps {
  activeTab: TabType
  serverRegion: ServerRegion
}

export function useNextResetLabel({ activeTab, serverRegion }: UseNextResetLabelProps) {
  const [now, setNow] = useState(() => Date.now())

  useVisibilityInterval(() => setNow(Date.now()), MS.LABEL_REFRESH)

  const nextResetLabel = useMemo(() => {
    const region = serverRegion ?? 'asia'
    const offset = getServerUTCOffset(region)
    const nowDate = new Date(now)
    const utc = nowDate.getTime() + nowDate.getTimezoneOffset() * 60000
    const serverDate = new Date(utc + offset * 3600000)
    let target: Date

    if (activeTab === 'daily') {
      target = new Date(serverDate)
      target.setHours(RESET_HOUR, 0, 0, 0)
      if (serverDate >= target) target.setDate(target.getDate() + 1)
    } else if (activeTab === 'weekly') {
      const resetDay = 1
      const currentDay = serverDate.getDay()
      const daysToReset = (resetDay - currentDay + 7) % 7
      target = new Date(serverDate)
      target.setDate(serverDate.getDate() + daysToReset)
      target.setHours(RESET_HOUR, 0, 0, 0)
      if (serverDate >= target) {
        target.setDate(target.getDate() + 7)
      }
    } else {
      target = new Date(serverDate)
      target.setDate(1)
      target.setHours(RESET_HOUR, 0, 0, 0)
      if (serverDate >= target) {
        target.setMonth(target.getMonth() + 1)
      }
    }

    const diffMs = target.getTime() - serverDate.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainHours = hours % 24
      return `${days}天${remainHours}小时后重置`
    }
    return `${hours}小时${minutes}分钟后重置`
  }, [activeTab, serverRegion, now])

  return nextResetLabel
}

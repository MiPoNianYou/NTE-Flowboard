import { useState, useMemo } from 'react'
import type { TabType, ServerRegion } from '../types'
import { MS, RESET_HOUR } from '../utils/constants'
import { getServerDate } from '../utils/timezone'
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
    const serverDate = getServerDate(region)
    let target: Date

    if (activeTab === 'daily') {
      target = new Date(serverDate)
      target.setHours(RESET_HOUR, 0, 0, 0)
      if (serverDate >= target) target.setDate(target.getDate() + 1)
    } else if (activeTab === 'weekly') {
      const resetDay = 1 // 周一
      const currentDay = serverDate.getDay()
      const daysToReset = (resetDay - currentDay + 7) % 7
      target = new Date(serverDate)
      target.setDate(serverDate.getDate() + daysToReset)
      target.setHours(RESET_HOUR, 0, 0, 0)
      if (serverDate >= target) {
        target.setDate(target.getDate() + 7)
      }
    } else {
      // 每月清单 — 每月 1 日重置
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 'now' 是触发器，不直接使用
  }, [activeTab, serverRegion, now])

  return nextResetLabel
}

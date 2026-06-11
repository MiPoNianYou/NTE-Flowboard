import { useState, useEffect, useMemo } from 'react'
import type { TabType, ResetConfig, CustomResetMode } from '../types'
import { MS } from '../utils/constants'
import { getServerDate } from '../utils/storage'

interface UseNextResetLabelProps {
  activeTab: TabType
  resetConfig: ResetConfig
  customResetMode?: CustomResetMode
}

export function useNextResetLabel({ activeTab, resetConfig, customResetMode }: UseNextResetLabelProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (document.hidden) return

    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now())
    }, MS.LABEL_REFRESH)

    const onVisibilityChange = () => {
      if (!document.hidden) setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const nextResetLabel = useMemo(() => {
    const region = resetConfig.serverRegion ?? 'asia'
    const nowDate = getServerDate(region)
    const resetHour = 5
    let target: Date

    if (activeTab === 'daily') {
      target = new Date(nowDate)
      target.setHours(resetHour, 0, 0, 0)
      if (nowDate >= target) target.setDate(target.getDate() + 1)
    } else if (activeTab === 'weekly') {
      const resetDay = 1 // 周一
      const currentDay = nowDate.getDay()
      const daysUntilReset = (resetDay - currentDay + 7) % 7
      target = new Date(nowDate)
      target.setDate(nowDate.getDate() + daysUntilReset)
      target.setHours(resetHour, 0, 0, 0)
      if (nowDate >= target) {
        target.setDate(target.getDate() + 7)
      }
    } else {
      // 自定义标签页 — 跟随 customResetMode（每日或每周）
      if (customResetMode === 'weekly') {
        const resetDay = 1 // 周一
        const currentDay = nowDate.getDay()
        const daysUntilReset = (resetDay - currentDay + 7) % 7
        target = new Date(nowDate)
        target.setDate(nowDate.getDate() + daysUntilReset)
        target.setHours(resetHour, 0, 0, 0)
        if (nowDate >= target) target.setDate(target.getDate() + 7)
      } else {
        // 每日（默认）
        target = new Date(nowDate)
        target.setHours(resetHour, 0, 0, 0)
        if (nowDate >= target) target.setDate(target.getDate() + 1)
      }
    }

    const diffMs = target.getTime() - nowDate.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainHours = hours % 24
      return `${days}天${remainHours}小时后重置`
    }
    return `${hours}小时${mins}分钟后重置`
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a trigger, not used directly
  }, [activeTab, resetConfig.serverRegion, customResetMode, now])

  return nextResetLabel
}

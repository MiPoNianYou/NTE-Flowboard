import { useMemo, useState } from 'react'
import type { ServerRegion, TabType } from '../types'
import { MS } from '../utils/constants'
import { getResetSchedule } from '../utils/resetCalendar'
import { useVisibilityInterval } from './useVisibilityInterval'

interface UseNextResetLabelProps {
  activeTab: TabType
  serverRegion: ServerRegion
}

export function useNextResetLabel({ activeTab, serverRegion }: UseNextResetLabelProps) {
  const [now, setNow] = useState(() => Date.now())

  useVisibilityInterval(() => setNow(Date.now()), MS.LABEL_REFRESH)

  return useMemo(() => {
    const currentTime = new Date(now)
    const { nextResetAt } = getResetSchedule(activeTab, serverRegion, currentTime)
    const diffMs = nextResetAt.getTime() - currentTime.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      return `${days}天${hours % 24}小时后重置`
    }

    return `${hours}小时${minutes}分钟后重置`
  }, [activeTab, now, serverRegion])
}

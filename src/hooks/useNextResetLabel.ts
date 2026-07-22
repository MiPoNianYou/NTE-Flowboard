import { useMemo, useState } from 'react'
import type { ServerRegion, TabType } from '../types'
import { MS } from '../utils/constants'
import { getResetSchedule } from '../utils/resetCalendar'
import { useVisibilityInterval } from './useVisibilityInterval'
import { useTranslation } from 'react-i18next'

interface UseNextResetLabelProps {
  activeTab: TabType
  serverRegion: ServerRegion
}

export function useNextResetLabel({ activeTab, serverRegion }: UseNextResetLabelProps) {
  const { t } = useTranslation()
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
      return t('reset.inDaysHours', { days, hours: hours % 24 })
    }

    return t('reset.inHoursMinutes', { hours, minutes })
  }, [activeTab, now, serverRegion, t])
}

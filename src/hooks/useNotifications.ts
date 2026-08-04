import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { SupportedLocale } from '../i18n/displayPreferences'
import type { ChecklistData, NotificationSettingsProps, ServerRegion } from '../types'
import {
  createNotificationLifecycle,
  toNotificationSettingsProps,
  type NotificationLifecycle,
} from '../utils/notificationLifecycle'

export function useNotifications(
  data: ChecklistData,
  serverRegion: ServerRegion,
  locale: SupportedLocale,
): NotificationSettingsProps | undefined {
  const lifecycleRef = useRef<NotificationLifecycle | null>(null)
  if (!lifecycleRef.current) {
    lifecycleRef.current = createNotificationLifecycle({
      initialData: data,
      initialRegion: serverRegion,
      initialLocale: locale,
    })
  }
  const lifecycle = lifecycleRef.current
  const snapshot = useSyncExternalStore(
    lifecycle.subscribe,
    lifecycle.getSnapshot,
    lifecycle.getSnapshot,
  )

  useEffect(() => {
    lifecycle.start()
    return lifecycle.stop
  }, [lifecycle])

  useEffect(() => {
    lifecycle.updateContext(data, serverRegion, locale)
  }, [data, lifecycle, locale, serverRegion])

  if (!snapshot.available) return undefined
  return toNotificationSettingsProps(lifecycle, snapshot)
}

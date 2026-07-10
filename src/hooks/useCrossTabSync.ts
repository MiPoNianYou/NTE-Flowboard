import { useEffect, useRef, useCallback } from 'react'

const CROSS_TAB_SYNC_KEY = 'flowboard-sync-event'
const CROSS_TAB_CHANNEL = 'flowboard-sync'

interface UseCrossTabSyncOptions {
  onRemoteUpdate: () => void
}

interface UseCrossTabSyncReturn {
  broadcast: (updatedAt: string) => void
}

export function useCrossTabSync({ onRemoteUpdate }: UseCrossTabSyncOptions): UseCrossTabSyncReturn {
  const instanceId = useRef(Math.random().toString(36).slice(2))
  const onRemoteUpdateRef = useRef(onRemoteUpdate)

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate
  }, [onRemoteUpdate])

  useEffect(() => {
    const handleRemoteUpdate = () => onRemoteUpdateRef.current()

    const channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CROSS_TAB_CHANNEL) : null

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'sync-updated' && event.data?.source !== instanceId.current) {
          handleRemoteUpdate()
        }
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CROSS_TAB_SYNC_KEY || !event.newValue) return
      try {
        const payload = JSON.parse(event.newValue) as { source?: string }
        if (payload.source === instanceId.current) return
        handleRemoteUpdate()
      } catch {
        handleRemoteUpdate()
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      channel?.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const broadcast = useCallback((updatedAt: string) => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CROSS_TAB_CHANNEL)
      channel.postMessage({ type: 'sync-updated', updatedAt, source: instanceId.current })
      channel.close()
    } else {
      localStorage.setItem(
        CROSS_TAB_SYNC_KEY,
        JSON.stringify({ updatedAt, source: instanceId.current }),
      )
    }
  }, [])

  return { broadcast }
}

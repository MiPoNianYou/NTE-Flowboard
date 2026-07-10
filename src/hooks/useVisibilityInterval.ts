import { useEffect, useRef } from 'react'

export function useVisibilityInterval(callback: () => void, intervalMs: number, isEnabled = true) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!isEnabled) return

    let interval: ReturnType<typeof setInterval> | null = null

    function startInterval() {
      if (interval) clearInterval(interval)
      interval = setInterval(() => {
        if (!document.hidden) callbackRef.current()
      }, intervalMs)
    }

    function stopInterval() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopInterval()
      } else {
        callbackRef.current()
        startInterval()
      }
    }

    startInterval()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs, isEnabled])
}

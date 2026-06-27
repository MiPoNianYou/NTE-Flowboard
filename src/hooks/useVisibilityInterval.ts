import { useEffect, useRef } from 'react'

/**
 * 在页面可见时运行 interval callback，隐藏时暂停，恢复时立即执行一次。
 * @param callback - 要定期执行的函数
 * @param intervalMs - 间隔毫秒数
 * @param isEnabled - 是否启用（默认 true）
 */
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

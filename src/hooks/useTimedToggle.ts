import { useState, useRef, useCallback, useEffect } from 'react'
import { MS } from '../utils/constants'

/**
 * 定时状态切换 hook。触发后自动在指定时间后恢复。
 * @param timeout - 持续时间（默认 MS.SUCCESS_HINT）
 */
export function useTimedToggle(timeout: number = MS.SUCCESS_HINT) {
  const [isShown, setIsShown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const trigger = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsShown(true)
    timerRef.current = setTimeout(() => setIsShown(false), timeout)
  }, [timeout])

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsShown(false)
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  return { isShown, trigger, dismiss }
}

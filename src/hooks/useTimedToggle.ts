import { useState, useRef, useCallback, useEffect } from 'react'
import { MS } from '../utils/constants'

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

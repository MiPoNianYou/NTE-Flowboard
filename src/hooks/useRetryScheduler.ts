import { useRef, useCallback, useEffect } from 'react'

type RetryKind = 'pull' | 'push'

interface UseRetrySchedulerOptions {
  delays: readonly number[]
  onRetry: (kind: RetryKind) => void
}

interface UseRetrySchedulerReturn {
  scheduleRetry: (kind: RetryKind) => void
  cancelRetry: () => void
  resetAttempts: () => void
}

export function useRetryScheduler({
  delays,
  onRetry,
}: UseRetrySchedulerOptions): UseRetrySchedulerReturn {
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onRetryRef = useRef(onRetry)

  useEffect(() => {
    onRetryRef.current = onRetry
  }, [onRetry])

  const cancelRetry = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(
    (kind: RetryKind) => {
      cancelRetry()
      const delay = delays[Math.min(attemptRef.current, delays.length - 1)]
      timerRef.current = setTimeout(() => {
        attemptRef.current += 1
        onRetryRef.current(kind)
      }, delay)
    },
    [cancelRetry, delays],
  )

  const resetAttempts = useCallback(() => {
    attemptRef.current = 0
  }, [])

  useEffect(() => cancelRetry, [cancelRetry])

  return { scheduleRetry, cancelRetry, resetAttempts }
}

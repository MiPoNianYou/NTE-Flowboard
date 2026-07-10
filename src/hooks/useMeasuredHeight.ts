import { useRef, useState, useCallback, useLayoutEffect } from 'react'

export function useMeasuredHeight<T extends HTMLElement>(
  debounceMs = 100,
): [(element: T | null) => void, number | null] {
  const [height, setHeight] = useState<number | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      observerRef.current?.disconnect()
    }
  }, [])

  const setRef = useCallback(
    (element: T | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null

      if (!element) return

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (debounceMs > 0) {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
              setHeight(entry.contentRect.height)
              timerRef.current = null
            }, debounceMs)
          } else {
            setHeight(entry.contentRect.height)
          }
        }
      })
      observer.observe(element)
      observerRef.current = observer
    },
    [debounceMs],
  )

  return [setRef, height]
}

import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.innerWidth < breakpoint
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mql.addEventListener('change', handler)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

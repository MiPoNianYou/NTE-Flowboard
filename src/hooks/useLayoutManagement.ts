import { useState, useCallback, useEffect } from 'react'

export function useLayoutManagement() {
  const [layout, setLayout] = useState<'single' | 'two-column'>(() => {
    const saved = localStorage.getItem('nte-layout')
    return saved === 'single' || saved === 'two-column' ? saved : 'two-column'
  })

  const [isLayoutTransitioning, setIsLayoutTransitioning] = useState(false)

  const toggleLayout = useCallback(() => {
    setIsLayoutTransitioning(true)
    setLayout((prev) => {
      const next = prev === 'two-column' ? 'single' : 'two-column'
      localStorage.setItem('nte-layout', next)
      return next
    })
  }, [])

  useEffect(() => {
    if (isLayoutTransitioning) {
      const timer = setTimeout(() => setIsLayoutTransitioning(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isLayoutTransitioning])

  return {
    layout,
    toggleLayout,
    isLayoutTransitioning,
  }
}

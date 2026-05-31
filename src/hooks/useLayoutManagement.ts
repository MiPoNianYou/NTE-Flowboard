import { useState, useCallback } from 'react'

export function useLayoutManagement() {
  const [layout, setLayout] = useState<'single' | 'two-column'>(() => {
    const saved = localStorage.getItem('nte-layout')
    return saved === 'single' || saved === 'two-column' ? saved : 'two-column'
  })

  const toggleLayout = useCallback(() => {
    setLayout((prev) => {
      const next = prev === 'two-column' ? 'single' : 'two-column'
      localStorage.setItem('nte-layout', next)
      return next
    })
  }, [])

  return {
    layout,
    toggleLayout,
  }
}

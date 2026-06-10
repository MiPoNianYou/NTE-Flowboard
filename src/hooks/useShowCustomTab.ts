import { useState, useCallback } from 'react'

const STORAGE_KEY = 'nte-show-custom-tab'

export function useShowCustomTab() {
  const [showCustomTab, setShowCustomTab] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'false',
  )

  const onShowCustomTabChange = useCallback((value: boolean) => {
    setShowCustomTab(value)
    localStorage.setItem(STORAGE_KEY, String(value))
  }, [])

  return { showCustomTab, onShowCustomTabChange }
}

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'nte-auto-move-completed'

export function useAutoMoveCompleted() {
  const [autoMoveCompleted, setAutoMoveCompleted] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'false',
  )

  const handleAutoMoveCompletedChange = useCallback((newVal: boolean) => {
    setAutoMoveCompleted(newVal)
    localStorage.setItem(STORAGE_KEY, String(newVal))
  }, [])

  return { autoMoveCompleted, onAutoMoveCompletedChange: handleAutoMoveCompletedChange }
}

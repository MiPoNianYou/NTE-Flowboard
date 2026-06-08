import { useState, useCallback } from 'react'

export function useConfirmDelete() {
  const [confirmDelete, setConfirmDelete] = useState(() => {
    return localStorage.getItem('nte-confirm-delete') !== 'false'
  })

  const onConfirmDeleteChange = useCallback((value: boolean) => {
    setConfirmDelete(value)
    localStorage.setItem('nte-confirm-delete', String(value))
  }, [])

  return { confirmDelete, onConfirmDeleteChange }
}

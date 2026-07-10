import { useState, useCallback } from 'react'

export function useLocalStorageBoolean(key: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) !== 'false')

  const onChange = useCallback(
    (newValue: boolean) => {
      setValue(newValue)
      localStorage.setItem(key, String(newValue))
    },
    [key],
  )

  return { value, onChange }
}

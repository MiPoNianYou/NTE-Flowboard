import { useState, useCallback } from 'react'

export function useLocalStorageBoolean(key: string, legacyKey?: string) {
  const [value, setValue] = useState(() => {
    if (legacyKey && localStorage.getItem(key) === null) {
      const legacy = localStorage.getItem(legacyKey)
      if (legacy !== null) {
        localStorage.setItem(key, legacy)
        localStorage.removeItem(legacyKey)
      }
    }
    return localStorage.getItem(key) !== 'false'
  })

  const onChange = useCallback(
    (newValue: boolean) => {
      setValue(newValue)
      localStorage.setItem(key, String(newValue))
    },
    [key],
  )

  return { value, onChange }
}

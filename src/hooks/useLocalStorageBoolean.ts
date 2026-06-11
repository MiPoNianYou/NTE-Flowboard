import { useState, useCallback } from 'react'

/**
 * 通用 localStorage boolean 状态 hook。
 * 读取 key 对应的 localStorage 值（不存在或 'false' 时返回 false，否则返回 true），
 * 并提供 setter 同步写入 localStorage。
 */
export function useLocalStorageBoolean(key: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) !== 'false')

  const onChange = useCallback(
    (newVal: boolean) => {
      setValue(newVal)
      localStorage.setItem(key, String(newVal))
    },
    [key],
  )

  return { value, onChange }
}

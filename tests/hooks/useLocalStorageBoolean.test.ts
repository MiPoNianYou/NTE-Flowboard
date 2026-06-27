import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useLocalStorageBoolean } from '../../src/hooks/useLocalStorageBoolean'

describe('useLocalStorageBoolean', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return true when key does not exist (null !== "false")', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))
    expect(result.current.value).toBe(true)
  })

  it('should return false when localStorage has "false"', () => {
    localStorage.setItem('test-key', 'false')
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))
    expect(result.current.value).toBe(false)
  })

  it('should return true when localStorage has "true"', () => {
    localStorage.setItem('test-key', 'true')
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))
    expect(result.current.value).toBe(true)
  })

  it('should return true for any non-"false" value', () => {
    localStorage.setItem('test-key', 'anything')
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))
    expect(result.current.value).toBe(true)
  })

  it('should update value and localStorage on onChange', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))

    act(() => {
      result.current.onChange(true)
    })

    expect(result.current.value).toBe(true)
    expect(localStorage.getItem('test-key')).toBe('true')
  })

  it('should set value to false via onChange', () => {
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))

    act(() => {
      result.current.onChange(false)
    })

    expect(result.current.value).toBe(false)
    expect(localStorage.getItem('test-key')).toBe('false')
  })

  it('should use different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorageBoolean('key-a'))
    const { result: result2 } = renderHook(() => useLocalStorageBoolean('key-b'))

    act(() => {
      result1.current.onChange(true)
    })

    expect(result1.current.value).toBe(true)
    expect(result2.current.value).toBe(true)
  })
})

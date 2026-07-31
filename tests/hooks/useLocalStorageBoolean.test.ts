import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useLocalStorageBoolean } from '../../src/hooks/useLocalStorageBoolean'

describe('useLocalStorageBoolean', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each([
    [null, true],
    ['false', false],
    ['true', true],
    ['anything', true],
  ])('should read %s as %s', (stored, expected) => {
    if (stored !== null) localStorage.setItem('test-key', stored)
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))
    expect(result.current.value).toBe(expected)
  })

  it.each([true, false])('should update state and storage to %s', (nextValue) => {
    const { result } = renderHook(() => useLocalStorageBoolean('test-key'))

    act(() => {
      result.current.onChange(nextValue)
    })

    expect(result.current.value).toBe(nextValue)
    expect(localStorage.getItem('test-key')).toBe(String(nextValue))
  })

  it('should use different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorageBoolean('key-a'))
    const { result: result2 } = renderHook(() => useLocalStorageBoolean('key-b'))

    act(() => {
      result1.current.onChange(false)
    })

    expect(result1.current.value).toBe(false)
    expect(result2.current.value).toBe(true)
    expect(localStorage.getItem('key-a')).toBe('false')
    expect(localStorage.getItem('key-b')).toBeNull()
  })
})

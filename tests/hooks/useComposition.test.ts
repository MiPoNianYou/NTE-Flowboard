import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useComposition } from '../../src/hooks/useComposition'

describe('useComposition', () => {
  it('初始状态 isComposingRef 为 false', () => {
    const { result } = renderHook(() => useComposition())
    expect(result.current.isComposingRef.current).toBe(false)
  })

  it('compositionStart 后 isComposingRef 变为 true', () => {
    const { result } = renderHook(() => useComposition())

    act(() => {
      result.current.onCompositionStart()
    })

    expect(result.current.isComposingRef.current).toBe(true)
  })

  it('compositionEnd 后 isComposingRef 恢复为 false', () => {
    const { result } = renderHook(() => useComposition())

    act(() => {
      result.current.onCompositionStart()
    })
    expect(result.current.isComposingRef.current).toBe(true)

    act(() => {
      result.current.onCompositionEnd()
    })
    expect(result.current.isComposingRef.current).toBe(false)
  })

  it('多次 compositionStart 不会出错', () => {
    const { result } = renderHook(() => useComposition())

    act(() => {
      result.current.onCompositionStart()
      result.current.onCompositionStart()
    })

    expect(result.current.isComposingRef.current).toBe(true)
  })

  it('未开始 composition 时直接调用 compositionEnd 仍为 false', () => {
    const { result } = renderHook(() => useComposition())

    act(() => {
      result.current.onCompositionEnd()
    })

    expect(result.current.isComposingRef.current).toBe(false)
  })

  it('回调引用在重渲染间保持稳定', () => {
    const { result, rerender } = renderHook(() => useComposition())

    const startRef = result.current.onCompositionStart
    const endRef = result.current.onCompositionEnd

    rerender()

    expect(result.current.onCompositionStart).toBe(startRef)
    expect(result.current.onCompositionEnd).toBe(endRef)
  })
})

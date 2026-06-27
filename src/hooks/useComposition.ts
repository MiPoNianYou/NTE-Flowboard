import { useRef, useCallback } from 'react'

/**
 * 中文输入法组合状态 hook，防止 IME 输入过程中触发事件。
 * 返回 composition 事件处理器和 isComposingRef，供组件自行判断。
 */
export function useComposition() {
  const isComposingRef = useRef(false)

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const onCompositionEnd = useCallback(() => {
    isComposingRef.current = false
  }, [])

  return { isComposingRef, onCompositionStart, onCompositionEnd }
}

import { useRef, useCallback } from 'react'

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

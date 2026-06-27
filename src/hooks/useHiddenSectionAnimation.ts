import { useState, useEffect, useCallback } from 'react'

type AnimationState = 'hidden' | 'entering' | 'visible' | 'exiting' | 'fadingOut'

export function useHiddenSectionAnimation(isVisible: boolean) {
  const [state, setState] = useState<AnimationState>(isVisible ? 'visible' : 'hidden')

  useEffect(() => {
    if (isVisible && (state === 'hidden' || state === 'exiting' || state === 'fadingOut')) {
      setState('entering')
    } else if (!isVisible && (state === 'visible' || state === 'entering')) {
      setState('exiting')
    }
  }, [isVisible, state])

  const onFrameEnter = useCallback(() => {
    setState('visible')
  }, [])

  const onContentExit = useCallback(() => {
    setState('fadingOut')
  }, [])

  const onFrameExit = useCallback(() => {
    setState('hidden')
  }, [])

  const frameOpacity = state === 'hidden' || state === 'fadingOut' ? 0 : 1
  const headerOpacity = state === 'fadingOut' || state === 'hidden' ? 0 : 1
  const shouldHide = state === 'hidden'
  const showContent = state === 'visible'

  return {
    state,
    frameOpacity,
    headerOpacity,
    shouldHide,
    showContent,
    onFrameEnter,
    onContentExit,
    onFrameExit,
  }
}

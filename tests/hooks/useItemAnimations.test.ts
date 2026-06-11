import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useItemAnimations } from '../../src/hooks/useItemAnimations'
import { MS } from '../../src/utils/constants'
import type { ChecklistItem, TabType } from '../../src/types'

const makeItem = (order: number, text = `任务${order}`): ChecklistItem => ({
  text,
  completed: false,
  hidden: false,
  order,
  tags: [],
})

describe('useItemAnimations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const defaults = {
    onDelete: vi.fn(),
    onHide: vi.fn(),
  }

  describe('new item tracking', () => {
    it('should not report new items on initial render', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1), makeItem(2)], ...defaults }),
      )
      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })
      expect(anim.initial).toBe(false)
    })

    it('should detect new items when they appear', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2)] })

      const anim = result.current.getItemAnimation(2, { activeTab: 'daily', mode: 'normal' })
      expect(anim.initial).toEqual({ opacity: 0, x: -20 })
    })

    it('should detect new items in virtual mode with different initial', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2)] })

      const anim = result.current.getItemAnimation(2, { activeTab: 'daily', mode: 'virtual' })
      expect(anim.initial).toEqual({ opacity: 0, y: -8 })
    })

    it('should clear new item status after ANIMATION_WINDOW', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2)] })
      let anim = result.current.getItemAnimation(2, { activeTab: 'daily', mode: 'normal' })
      expect(anim.initial).toEqual({ opacity: 0, x: -20 })

      vi.advanceTimersByTime(MS.ANIMATION_WINDOW)

      anim = result.current.getItemAnimation(2, { activeTab: 'daily', mode: 'normal' })
      expect(anim.initial).toBe(false)
    })

    it('should track multiple new items', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2), makeItem(3)] })

      const anim2 = result.current.getItemAnimation(2, { activeTab: 'daily', mode: 'normal' })
      const anim3 = result.current.getItemAnimation(3, { activeTab: 'daily', mode: 'normal' })
      expect(anim2.initial).toEqual({ opacity: 0, x: -20 })
      expect(anim3.initial).toEqual({ opacity: 0, x: -20 })
    })
  })

  describe('exit animations', () => {
    it('handleDeleteStart should produce exit-right animation', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], ...defaults }),
      )

      act(() => {
        result.current.handleDeleteStart('daily', 1)
      })

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })
      expect(anim.animate).toEqual({ opacity: 0, x: 40 })
    })

    it('handleHideStart should produce exit-left animation', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], ...defaults }),
      )

      act(() => {
        result.current.handleHideStart('daily', 1)
      })

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })
      expect(anim.animate).toEqual({ opacity: 0, x: -40 })
    })

    it('non-exiting items should get visible animate', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], ...defaults }),
      )

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })
      expect(anim.animate).toEqual({ opacity: 1, x: 0 })
    })

    it('onAnimationComplete should call onDelete after delay', () => {
      const onDelete = vi.fn()
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], onDelete, onHide: vi.fn() }),
      )

      act(() => {
        result.current.handleDeleteStart('daily', 1)
      })

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })

      act(() => {
        anim.onAnimationComplete()
      })

      expect(onDelete).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(40)
      })

      expect(onDelete).toHaveBeenCalledWith('daily', 1)
    })

    it('onAnimationComplete should call onHide after delay', () => {
      const onHide = vi.fn()
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], onDelete: vi.fn(), onHide }),
      )

      act(() => {
        result.current.handleHideStart('daily', 1)
      })

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })

      act(() => {
        anim.onAnimationComplete()
      })

      act(() => {
        vi.advanceTimersByTime(40)
      })

      expect(onHide).toHaveBeenCalledWith('daily', 1)
    })

    it('onAnimationComplete should not call callbacks for non-exiting items', () => {
      const onDelete = vi.fn()
      const onHide = vi.fn()
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], onDelete, onHide }),
      )

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })

      act(() => {
        anim.onAnimationComplete()
      })

      expect(onDelete).not.toHaveBeenCalled()
      expect(onHide).not.toHaveBeenCalled()
    })
  })

  describe('transition config', () => {
    it('normal mode should use spring layout transition', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], ...defaults }),
      )

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'normal' })
      expect(anim.transition).toHaveProperty('layout')
      expect((anim.transition as Record<string, unknown>).layout).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 30,
      })
    })

    it('virtual mode should not have layout transition', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], ...defaults }),
      )

      const anim = result.current.getItemAnimation(1, { activeTab: 'daily', mode: 'virtual' })
      expect(anim.transition).not.toHaveProperty('layout')
    })
  })
})

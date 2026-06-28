import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useItemAnimations } from '../../src/hooks/useItemAnimations'
import { MS } from '../../src/utils/constants'
import { ITEM_ENTRY } from '../../src/utils/motion'
import type { ChecklistItem } from '../../src/types'

const makeItem = (order: number, text = `任务${order}`): ChecklistItem => ({
  id: `ia${order}`,
  text,
  isCompleted: false,
  isHidden: false,
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
        useItemAnimations({ visibleItems: [makeItem(1), makeItem(2)], activeTab: 'daily', ...defaults }),
      )
      const animation = result.current.getItemAnimation('ia1', { targetTab: 'daily' })
      expect(animation.initial).toBe(false)
    })

    it('should detect new items when they appear', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, activeTab: 'daily', ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2)] })

      const animation = result.current.getItemAnimation('ia2', { targetTab: 'daily' })
      expect(animation.initial).toEqual({ opacity: 0, height: 0 })
    })

    it('should clear new item status after ANIMATION_WINDOW', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, activeTab: 'daily', ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2)] })
      let animation = result.current.getItemAnimation('ia2', { targetTab: 'daily' })
      expect(animation.initial).toEqual({ opacity: 0, height: 0 })

      vi.advanceTimersByTime(MS.ANIMATION_WINDOW)

      animation = result.current.getItemAnimation('ia2', { targetTab: 'daily' })
      expect(animation.initial).toBe(false)
    })

    it('should track multiple new items', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useItemAnimations({ visibleItems: items, activeTab: 'daily', ...defaults }),
        { initialProps: { items: [makeItem(1)] } },
      )

      rerender({ items: [makeItem(1), makeItem(2), makeItem(3)] })

      const animation2 = result.current.getItemAnimation('ia2', { targetTab: 'daily' })
      const animation3 = result.current.getItemAnimation('ia3', { targetTab: 'daily' })
      expect(animation2.initial).toEqual({ opacity: 0, height: 0 })
      expect(animation3.initial).toEqual({ opacity: 0, height: 0 })
    })
  })

  describe('exit animations', () => {
    it('handleDeleteStart should call onDelete immediately', () => {
      const onDelete = vi.fn()
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], activeTab: 'daily', onDelete, onHide: vi.fn() }),
      )

      act(() => {
        result.current.handleDeleteStart('daily', 'ia1')
      })

      expect(onDelete).toHaveBeenCalledWith('daily', 'ia1')
    })

    it('handleHideStart should call onHide immediately', () => {
      const onHide = vi.fn()
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], activeTab: 'daily', onDelete: vi.fn(), onHide }),
      )

      act(() => {
        result.current.handleHideStart('daily', 'ia1')
      })

      expect(onHide).toHaveBeenCalledWith('daily', 'ia1')
    })

    it('non-exiting items should get visible animation', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], activeTab: 'daily', ...defaults }),
      )

      const animation = result.current.getItemAnimation('ia1', { targetTab: 'daily' })
      expect(animation.animate).toEqual({ opacity: 1, height: 'auto' })
    })

    it('onAnimationComplete should be a no-op', () => {
      const onDelete = vi.fn()
      const onHide = vi.fn()
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], activeTab: 'daily', onDelete, onHide }),
      )

      const animation = result.current.getItemAnimation('ia1', { targetTab: 'daily' })

      act(() => {
        animation.onAnimationComplete()
      })

      expect(onDelete).not.toHaveBeenCalled()
      expect(onHide).not.toHaveBeenCalled()
    })
  })

  describe('transition config', () => {
    it('should use item entry transition', () => {
      const { result } = renderHook(() =>
        useItemAnimations({ visibleItems: [makeItem(1)], activeTab: 'daily', ...defaults }),
      )

      const animation = result.current.getItemAnimation('ia1', { targetTab: 'daily' })
      expect(animation.transition).toEqual(ITEM_ENTRY)
    })
  })
})

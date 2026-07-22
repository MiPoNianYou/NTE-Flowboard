import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { DISPLAY_PREFERENCES_STORAGE_KEY } from '../i18n/displayPreferences'
import i18n from '../i18n'

class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
}

beforeEach(() => {
  localStorage.setItem(
    DISPLAY_PREFERENCES_STORAGE_KEY,
    JSON.stringify({ language: 'zh-CN', timeFormat: '24h' }),
  )
  void i18n.changeLanguage('zh-CN')
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

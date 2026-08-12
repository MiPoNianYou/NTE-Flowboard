import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { LOCAL_UI_PREFERENCES_STORAGE_KEY } from '../src/utils/localUiPreferences'
import i18n from '../src/i18n'

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
    LOCAL_UI_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      theme: 'dark',
      language: 'zh-CN',
      timeFormat: '24h',
      hiddenSectionOpen: true,
    }),
  )
  void i18n.changeLanguage('zh-CN')
})

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

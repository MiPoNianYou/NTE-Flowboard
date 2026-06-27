import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

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

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

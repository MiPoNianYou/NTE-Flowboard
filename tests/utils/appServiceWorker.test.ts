import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('app service worker registration', () => {
  let originalDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
  })

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalDescriptor)
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker')
    }
  })

  it('registers the unified worker once at the application base path', async () => {
    vi.resetModules()
    const register = vi.fn().mockResolvedValue({ scope: '/NTE-Flowboard/' })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    })
    const { registerAppServiceWorker } = await import('../../src/utils/appServiceWorker')

    const first = await registerAppServiceWorker()
    const second = await registerAppServiceWorker()

    expect(first).toBe(second)
    expect(register).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}flowboard-sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
  })

  it('retries registration after a failure', async () => {
    vi.resetModules()
    const registration = { scope: '/NTE-Flowboard/' }
    const register = vi
      .fn()
      .mockRejectedValueOnce(new Error('registration failed'))
      .mockResolvedValueOnce(registration)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    })
    const { registerAppServiceWorker } = await import('../../src/utils/appServiceWorker')

    await expect(registerAppServiceWorker()).rejects.toThrow('registration failed')
    await expect(registerAppServiceWorker()).resolves.toBe(registration)
    expect(register).toHaveBeenCalledTimes(2)
  })
})

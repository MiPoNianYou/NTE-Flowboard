const APP_SERVICE_WORKER_FILE = 'flowboard-sw.js'

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null

function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

export function registerAppServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isServiceWorkerSupported()) return Promise.reject(new Error('SERVICE_WORKER_UNSUPPORTED'))
  if (!registrationPromise) {
    const scope = import.meta.env.BASE_URL
    registrationPromise = navigator.serviceWorker
      .register(`${scope}${APP_SERVICE_WORKER_FILE}`, { scope })
      .catch((error) => {
        registrationPromise = null
        throw error
      })
  }
  return registrationPromise
}

export async function findAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null
  return (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)) ?? null
}

export interface ToastPayload {
  id: number
  message: string
  type: 'error' | 'warning'
}

const TOAST_EVENT = 'storage-toast'

class ToastBus extends EventTarget {
  private _id = 0

  emit(message: string, type: ToastPayload['type'] = 'error'): void {
    const detail: ToastPayload = { id: ++this._id, message, type }
    this.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail }))
  }

  subscribe(handler: (payload: ToastPayload) => void): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<ToastPayload>).detail)
    this.addEventListener(TOAST_EVENT, listener)
    return () => this.removeEventListener(TOAST_EVENT, listener)
  }
}

export const toastBus = new ToastBus()

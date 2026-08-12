export type LegacyStorageEvent = 'conflict' | 'failed'

type LegacyStorageEventListener = (event: LegacyStorageEvent) => void

const listeners = new Set<LegacyStorageEventListener>()
const pendingEvents = new Set<LegacyStorageEvent>()

function publishLegacyStorageEvent(event: LegacyStorageEvent): void {
  if (listeners.size === 0) {
    pendingEvents.add(event)
    return
  }
  for (const listener of listeners) listener(event)
}

export function reportLegacyStorageConflict(): void {
  publishLegacyStorageEvent('conflict')
}

export function reportLegacyStorageFailure(): void {
  publishLegacyStorageEvent('failed')
}

export function subscribeLegacyStorageEvents(listener: LegacyStorageEventListener): () => void {
  listeners.add(listener)
  for (const event of pendingEvents) listener(event)
  pendingEvents.clear()
  return () => listeners.delete(listener)
}

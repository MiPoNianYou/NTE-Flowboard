import type { ChecklistData } from '../types'
import { createDefaultChecklistData, DEFAULT_CHECKLIST_DATA } from './defaultData'

interface PullGuards {
  isPulling: boolean
  hasLocalChanges: boolean
  shouldForce: boolean
}

export function shouldPull(guards: PullGuards): boolean {
  if (guards.isPulling) return false
  if (!guards.shouldForce && guards.hasLocalChanges) return false
  return true
}

interface ImportDecision {
  remoteUpdatedAt: string
  lastSeenTime: string | null
  skipFirstImport: boolean
}

export function shouldImport(decision: ImportDecision): boolean {
  const remoteTime = new Date(decision.remoteUpdatedAt)
  if (decision.skipFirstImport) {
    return !!decision.lastSeenTime && remoteTime > new Date(decision.lastSeenTime)
  }
  return !decision.lastSeenTime || remoteTime > new Date(decision.lastSeenTime)
}

export function shouldImportInitialRemoteData(data: ChecklistData): boolean {
  const defaults = [DEFAULT_CHECKLIST_DATA, createDefaultChecklistData('en-US')]
  return defaults.some(
    (defaultData) =>
      JSON.stringify(data.daily) === JSON.stringify(defaultData.daily) &&
      JSON.stringify(data.weekly) === JSON.stringify(defaultData.weekly) &&
      JSON.stringify(data.monthly) === JSON.stringify(defaultData.monthly),
  )
}

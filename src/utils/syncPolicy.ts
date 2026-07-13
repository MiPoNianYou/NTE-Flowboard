import type { ChecklistData } from '../types'
import { DEFAULT_CHECKLIST_DATA } from './defaultData'

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
  return (
    JSON.stringify(data.daily) === JSON.stringify(DEFAULT_CHECKLIST_DATA.daily) &&
    JSON.stringify(data.weekly) === JSON.stringify(DEFAULT_CHECKLIST_DATA.weekly) &&
    JSON.stringify(data.monthly) === JSON.stringify(DEFAULT_CHECKLIST_DATA.monthly)
  )
}

export function resolveConflict(hasLocalChanges: boolean): 'local' | 'remote' {
  return hasLocalChanges ? 'local' : 'remote'
}

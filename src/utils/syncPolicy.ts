/** 同步策略：纯决策函数，无 I/O，无副作用 */

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

export function resolveConflict(hasLocalChanges: boolean): 'local' | 'remote' {
  return hasLocalChanges ? 'local' : 'remote'
}

import { describe, expect, it } from 'vitest'
import { coordinateSync, type SyncCoordinationState } from '../../utils/syncCoordinator'

const state = (overrides: Partial<SyncCoordinationState> = {}): SyncCoordinationState => ({
  syncStatus: 'connected',
  isPulling: false,
  hasLocalChanges: false,
  shouldSkipNextPush: false,
  lastSeenTime: null,
  isDataInitialized: true,
  ...overrides,
})
const data = {
  daily: [],
  weekly: [],
  monthly: [],
  lastDailyReset: '',
  lastWeeklyReset: '',
  lastMonthlyReset: '',
  settings: { serverRegion: 'asia' as const, isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
}

describe('coordinateSync', () => {
  it('schedules a push only for a local change while connected', () =>
    expect(coordinateSync(state(), { kind: 'local-data-changed' }).command).toBe('schedule-push'))
  it('skips the automatic push caused by a remote import', () =>
    expect(
      coordinateSync(state({ shouldSkipNextPush: true }), { kind: 'local-data-changed' }).state
        .hasLocalChanges,
    ).toBe(false))
  it('does not periodically pull over pending local data', () =>
    expect(
      coordinateSync(state({ hasLocalChanges: true }), { kind: 'request-pull', force: false })
        .command,
    ).toBe('none'))
  it('imports a newer remote snapshot and suppresses its next push', () => {
    const result = coordinateSync(state(), {
      kind: 'pull-succeeded',
      data,
      updatedAt: '2026-07-01T00:00:00.000Z',
      skipFirstImport: false,
      pushAfterPull: true,
    })
    expect(result.command).toBe('import-remote')
    expect(result.state.shouldSkipNextPush).toBe(true)
  })
  it('pushes after a setup pull that has no remote snapshot to import', () =>
    expect(
      coordinateSync(state({ lastSeenTime: '2026-07-01T00:00:00.000Z' }), {
        kind: 'pull-succeeded',
        data,
        updatedAt: '2026-06-01T00:00:00.000Z',
        skipFirstImport: false,
        pushAfterPull: true,
      }).command,
    ).toBe('push'))
})

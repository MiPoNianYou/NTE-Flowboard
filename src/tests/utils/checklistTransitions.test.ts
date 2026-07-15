import { describe, expect, it } from 'vitest'
import type { ChecklistData } from '../../types'
import { applyChecklistTransition } from '../../utils/checklistTransitions'

function createData(overrides: Partial<ChecklistData> = {}): ChecklistData {
  return {
    daily: [
      {
        id: 'daily-1',
        text: '晨间任务',
        isCompleted: false,
        isHidden: false,
        order: 2,
        tags: ['开始'],
      },
      { id: 'daily-2', text: '晚间任务', isCompleted: true, isHidden: false, order: 4, tags: [] },
    ],
    weekly: [
      { id: 'weekly-1', text: '周任务', isCompleted: true, isHidden: false, order: 1, tags: [] },
    ],
    monthly: [
      { id: 'monthly-1', text: '月任务', isCompleted: true, isHidden: true, order: 1, tags: [] },
    ],
    lastDailyReset: '2026-07-12T21:00:00.000Z',
    lastWeeklyReset: '2026-07-05T21:00:00.000Z',
    lastMonthlyReset: '2026-06-30T21:00:00.000Z',
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    uiPreferences: { cloudPatchHidden: false },
    ...overrides,
  }
}

describe('applyChecklistTransition task changes', () => {
  it('adds a caller-provided item at the next collection order', () => {
    const result = applyChecklistTransition(createData(), {
      kind: 'add-item',
      cycle: 'daily',
      item: {
        id: 'daily-3',
        text: '新任务',
        isCompleted: false,
        isHidden: false,
        order: 0,
        tags: ['重要'],
      },
    })

    expect(result.daily[result.daily.length - 1]).toMatchObject({
      id: 'daily-3',
      order: 5,
      tags: ['重要'],
    })
  })

  it('edits, toggles, hides, shows, and removes one task without changing other cycles', () => {
    const data = createData()
    const edited = applyChecklistTransition(data, {
      kind: 'edit-item',
      cycle: 'daily',
      id: 'daily-1',
      text: '已编辑',
      tags: ['重要'],
    })
    const toggled = applyChecklistTransition(edited, {
      kind: 'toggle-item',
      cycle: 'daily',
      id: 'daily-1',
    })
    const hidden = applyChecklistTransition(toggled, {
      kind: 'set-item-hidden',
      cycle: 'daily',
      id: 'daily-1',
      isHidden: true,
    })
    const shown = applyChecklistTransition(hidden, {
      kind: 'set-item-hidden',
      cycle: 'daily',
      id: 'daily-1',
      isHidden: false,
    })
    const removed = applyChecklistTransition(shown, {
      kind: 'remove-item',
      cycle: 'daily',
      id: 'daily-2',
    })

    expect(removed.daily).toEqual([
      {
        id: 'daily-1',
        text: '已编辑',
        isCompleted: true,
        isHidden: false,
        order: 2,
        tags: ['重要'],
      },
    ])
    expect(removed.weekly).toBe(data.weekly)
  })

  it('reorders by order and normalizes the resulting collection', () => {
    const result = applyChecklistTransition(createData(), {
      kind: 'reorder-item',
      cycle: 'daily',
      activeId: 'daily-2',
      overId: 'daily-1',
    })

    expect(result.daily.map((item) => [item.id, item.order])).toEqual([
      ['daily-2', 1],
      ['daily-1', 2],
    ])
  })
})

describe('applyChecklistTransition resets and replacement', () => {
  it('manually resets one cycle, preserves every other task field, and records actual execution time', () => {
    const data = createData()
    const result = applyChecklistTransition(data, {
      kind: 'manual-reset',
      cycle: 'monthly',
      now: new Date('2026-07-13T02:00:00.000Z'),
    })

    expect(result.monthly[0]).toEqual({
      id: 'monthly-1',
      text: '月任务',
      isCompleted: false,
      isHidden: true,
      order: 1,
      tags: [],
    })
    expect(result.lastMonthlyReset).toBe('2026-07-13T02:00:00.000Z')
    expect(result.daily).toBe(data.daily)
  })

  it('applies every due reset using Reset Calendar while preserving the data model', () => {
    const data = createData({
      lastDailyReset: '2026-07-12T20:59:59.000Z',
      lastWeeklyReset: '2026-07-05T20:59:59.000Z',
      lastMonthlyReset: '2026-06-30T20:59:59.000Z',
    })
    const result = applyChecklistTransition(data, {
      kind: 'apply-due-resets',
      now: new Date('2026-07-12T21:00:00.000Z'),
    })

    expect(result.daily.every((item) => !item.isCompleted)).toBe(true)
    expect(result.weekly.every((item) => !item.isCompleted)).toBe(true)
    expect(result.monthly.every((item) => !item.isCompleted)).toBe(true)
    expect(result.lastDailyReset).toBe('2026-07-12T21:00:00.000Z')
  })

  it('replaces imported data without merging or applying a reset', () => {
    const data = createData()
    const imported = createData({ daily: [], lastDailyReset: '2000-01-01T00:00:00.000Z' })

    expect(applyChecklistTransition(data, { kind: 'replace-data', data: imported })).toBe(imported)
  })
})

describe('applyChecklistTransition settings and no-ops', () => {
  it('merges settings and UI preferences without changing unrelated data', () => {
    const data = createData()
    const settings = applyChecklistTransition(data, {
      kind: 'update-settings',
      partial: { isAutoMoveEnabled: false },
    })
    const preferences = applyChecklistTransition(settings, {
      kind: 'update-ui-preferences',
      partial: { cloudPatchHidden: true },
    })

    expect(preferences.settings).toEqual({ ...data.settings, isAutoMoveEnabled: false })
    expect(preferences.uiPreferences).toEqual({ cloudPatchHidden: true })
    expect(preferences.daily).toBe(data.daily)
  })

  it('returns the original snapshot for no-op task, order, and settings intents', () => {
    const data = createData()

    expect(
      applyChecklistTransition(data, {
        kind: 'edit-item',
        cycle: 'daily',
        id: 'missing',
        text: 'x',
        tags: [],
      }),
    ).toBe(data)
    expect(
      applyChecklistTransition(data, {
        kind: 'set-item-hidden',
        cycle: 'daily',
        id: 'daily-1',
        isHidden: false,
      }),
    ).toBe(data)
    expect(
      applyChecklistTransition(data, {
        kind: 'reorder-item',
        cycle: 'daily',
        activeId: 'daily-1',
        overId: 'daily-1',
      }),
    ).toBe(data)
    expect(
      applyChecklistTransition(data, {
        kind: 'update-settings',
        partial: { isAutoMoveEnabled: true },
      }),
    ).toBe(data)
  })
})

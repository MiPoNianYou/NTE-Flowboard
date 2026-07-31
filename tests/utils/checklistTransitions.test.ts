import { describe, expect, it } from 'vitest'
import type { ChecklistData } from '../../src/types'
import { applyChecklistTransition } from '../../src/utils/checklistTransitions'

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
    const data = createData()
    const result = applyChecklistTransition(createData({ daily: [data.daily[1], data.daily[0]] }), {
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

  it('sets completion explicitly and preserves identity when the state already matches', () => {
    const data = createData()
    const completed = applyChecklistTransition(data, {
      kind: 'set-item-completed',
      cycle: 'daily',
      id: 'daily-1',
      isCompleted: true,
    })

    expect(completed.daily[0].isCompleted).toBe(true)
    expect(
      applyChecklistTransition(completed, {
        kind: 'set-item-completed',
        cycle: 'daily',
        id: 'daily-1',
        isCompleted: true,
      }),
    ).toBe(completed)
  })

  it('updates text and tags independently while treating identical edits as no-ops', () => {
    const data = createData()
    const textChanged = applyChecklistTransition(data, {
      kind: 'edit-item',
      cycle: 'daily',
      id: 'daily-1',
      text: '新名称',
      tags: data.daily[0].tags,
    })
    const tagsChanged = applyChecklistTransition(data, {
      kind: 'edit-item',
      cycle: 'daily',
      id: 'daily-1',
      text: data.daily[0].text,
      tags: ['不同'],
    })

    expect(textChanged.daily[0]).toMatchObject({ text: '新名称', tags: ['开始'] })
    expect(tagsChanged.daily[0]).toMatchObject({ text: '晨间任务', tags: ['不同'] })
    expect(
      applyChecklistTransition(data, {
        kind: 'edit-item',
        cycle: 'daily',
        id: 'daily-1',
        text: data.daily[0].text,
        tags: [...data.daily[0].tags],
      }),
    ).toBe(data)
  })

  it('ignores removals and reorder targets that do not exist', () => {
    const data = createData()
    expect(
      applyChecklistTransition(data, {
        kind: 'remove-item',
        cycle: 'daily',
        id: 'missing',
      }),
    ).toBe(data)
    expect(
      applyChecklistTransition(data, {
        kind: 'reorder-item',
        cycle: 'daily',
        activeId: 'missing',
        overId: 'daily-1',
      }),
    ).toBe(data)
    expect(
      applyChecklistTransition(data, {
        kind: 'reorder-item',
        cycle: 'daily',
        activeId: 'daily-1',
        overId: 'missing',
      }),
    ).toBe(data)
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
    expect(applyChecklistTransition(data, { kind: 'replace-data', data })).toBe(data)
  })

  it('keeps an empty already-reset cycle unchanged and only updates a new timestamp', () => {
    const timestamp = '2026-07-13T02:00:00.000Z'
    const data = createData({ daily: [], lastDailyReset: timestamp })

    expect(
      applyChecklistTransition(data, {
        kind: 'manual-reset',
        cycle: 'daily',
        now: new Date(timestamp),
      }),
    ).toBe(data)

    const updated = applyChecklistTransition(data, {
      kind: 'manual-reset',
      cycle: 'daily',
      now: new Date('2026-07-14T02:00:00.000Z'),
    })
    expect(updated.daily).toBe(data.daily)
    expect(updated.lastDailyReset).toBe('2026-07-14T02:00:00.000Z')
  })

  it('returns the original data when no scheduled reset is due', () => {
    const data = createData({
      lastDailyReset: '2026-07-12T21:00:00.000Z',
      lastWeeklyReset: '2026-07-12T21:00:00.000Z',
      lastMonthlyReset: '2026-07-12T21:00:00.000Z',
    })

    expect(
      applyChecklistTransition(data, {
        kind: 'apply-due-resets',
        now: new Date('2026-07-12T22:00:00.000Z'),
      }),
    ).toBe(data)
  })

  it('restores a backed-up checklist snapshot without rolling back settings', () => {
    const data = createData({
      settings: { serverRegion: 'europe', isAutoMoveEnabled: false, shouldConfirmDelete: false },
    })
    const snapshot = {
      daily: [],
      weekly: data.weekly,
      monthly: data.monthly,
      lastDailyReset: '2025-01-01T00:00:00.000Z',
      lastWeeklyReset: '2025-01-02T00:00:00.000Z',
      lastMonthlyReset: '2025-01-03T00:00:00.000Z',
    }
    const result = applyChecklistTransition(data, {
      kind: 'restore-checklist-content',
      snapshot,
    })

    expect(result).toEqual({ ...data, ...snapshot })
    expect(result.settings).toBe(data.settings)
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
    expect(
      applyChecklistTransition(data, {
        kind: 'update-ui-preferences',
        partial: { cloudPatchHidden: false },
      }),
    ).toBe(data)
    expect(applyChecklistTransition(data, { kind: 'update-settings', partial: {} })).toBe(data)
  })
})

import { describe, expect, it } from 'vitest'
import type { ChecklistContentSnapshot } from '../../src/types'
import { isChecklistContentSnapshot, isChecklistData } from '../../src/utils/validation'

function createSnapshot(): ChecklistContentSnapshot {
  return {
    daily: [
      {
        id: 'item-1',
        text: 'Task',
        isCompleted: false,
        isHidden: false,
        order: 1,
        tags: ['Tag'],
      },
    ],
    weekly: [],
    monthly: [],
    lastDailyReset: '2026-07-01T00:00:00.000Z',
    lastWeeklyReset: '2026-07-01T00:00:00.000Z',
    lastMonthlyReset: '2026-07-01T00:00:00.000Z',
  }
}

describe('checklist validation', () => {
  it('accepts complete snapshots and legacy items without id or tags', () => {
    expect(isChecklistContentSnapshot(createSnapshot())).toBe(true)
    expect(
      isChecklistData({
        ...createSnapshot(),
        daily: [{ text: 'Legacy', isCompleted: false, isHidden: false, order: 1 }],
      }),
    ).toBe(true)
  })

  it.each([null, undefined, 'snapshot', 1, [], {}])(
    'rejects a non-snapshot top-level value: %p',
    (value) => {
      expect(isChecklistContentSnapshot(value)).toBe(false)
      expect(isChecklistData(value)).toBe(false)
    },
  )

  it.each([
    null,
    { id: 1 },
    { text: 1 },
    { isCompleted: 'false' },
    { isHidden: 0 },
    { order: '1' },
    { tags: 'Tag' },
    { tags: ['valid', 1] },
  ])('rejects an item with an invalid field: %p', (changes) => {
    const snapshot = createSnapshot()
    snapshot.daily =
      changes === null
        ? [null as unknown as (typeof snapshot.daily)[number]]
        : [{ ...snapshot.daily[0], ...(changes as object) }]

    expect(isChecklistContentSnapshot(snapshot)).toBe(false)
  })

  it.each(['daily', 'weekly', 'monthly'] as const)('requires %s to be an item array', (key) => {
    const snapshot = { ...createSnapshot(), [key]: null }
    expect(isChecklistContentSnapshot(snapshot)).toBe(false)
  })

  it.each(['lastDailyReset', 'lastWeeklyReset', 'lastMonthlyReset'] as const)(
    'requires %s to be a timestamp string',
    (key) => {
      const snapshot = { ...createSnapshot(), [key]: 1 }
      expect(isChecklistContentSnapshot(snapshot)).toBe(false)
    },
  )
})

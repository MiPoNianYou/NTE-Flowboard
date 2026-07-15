import { describe, expect, it } from 'vitest'
import {
  addTagToCollection,
  removeTagFromCollection,
  TAG_COLLECTION_LIMIT,
} from '../../utils/tagCollection'

describe('addTagToCollection', () => {
  it('trims and appends a distinct tag', () => {
    expect(addTagToCollection(['任务'], '  重要  ')).toEqual({
      kind: 'added',
      tags: ['任务', '重要'],
    })
  })

  it('returns the original collection for empty input', () => {
    const tags = ['任务']
    const result = addTagToCollection(tags, '   ')

    expect(result).toEqual({ kind: 'empty', tags })
    expect(result.tags).toBe(tags)
  })

  it('uses trimmed exact equality for duplicate detection', () => {
    const tags = ['Work']

    expect(addTagToCollection(tags, ' Work ')).toEqual({ kind: 'duplicate', tags })
    expect(addTagToCollection(tags, 'work')).toEqual({ kind: 'added', tags: ['Work', 'work'] })
  })

  it('rejects additions after the shared limit', () => {
    const tags = Array.from({ length: TAG_COLLECTION_LIMIT }, (_, index) => `标签${index + 1}`)

    expect(addTagToCollection(tags, '额外标签')).toEqual({ kind: 'limit-reached', tags })
  })
})

describe('removeTagFromCollection', () => {
  it('removes only the requested tag and preserves the remaining order', () => {
    expect(removeTagFromCollection(['首要', '次要', '收尾'], '次要')).toEqual(['首要', '收尾'])
  })
})

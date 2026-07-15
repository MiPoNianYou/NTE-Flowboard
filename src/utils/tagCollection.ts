import type { TagCollectionResult } from '../types'

export const TAG_COLLECTION_LIMIT = 5

export function addTagToCollection(tags: string[], value: string): TagCollectionResult {
  const tag = value.trim()
  if (!tag) return { kind: 'empty', tags }
  if (tags.includes(tag)) return { kind: 'duplicate', tags }
  if (tags.length >= TAG_COLLECTION_LIMIT) return { kind: 'limit-reached', tags }

  return { kind: 'added', tags: [...tags, tag] }
}

export function removeTagFromCollection(tags: string[], tagToRemove: string): string[] {
  return tags.filter((tag) => tag !== tagToRemove)
}

const TAG_COLORS = [
  'bg-tag-blue/10 text-tag-blue dark:bg-tag-blue/15 dark:text-tag-blue-soft',
  'bg-tag-purple/10 text-tag-purple dark:bg-tag-purple/15 dark:text-tag-purple-soft',
  'bg-tag-amber/10 text-tag-amber dark:bg-tag-amber/15 dark:text-tag-amber-soft',
  'bg-tag-red/10 text-tag-red dark:bg-tag-red/15 dark:text-tag-red-soft',
  'bg-tag-green/10 text-tag-green dark:bg-tag-green/15 dark:text-tag-green-soft',
  'bg-tag-teal/10 text-tag-teal dark:bg-tag-teal/15 dark:text-tag-teal-soft',
  'bg-tag-indigo/10 text-tag-indigo dark:bg-tag-indigo/15 dark:text-tag-indigo-soft',
  'bg-tag-pink/10 text-tag-pink dark:bg-tag-pink/15 dark:text-tag-pink-soft',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getTagColor(tag: string): string {
  return TAG_COLORS[hashString(tag) % TAG_COLORS.length]
}

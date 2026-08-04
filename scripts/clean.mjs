import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const repositoryRootUrl = new URL('../', import.meta.url)
const generatedPaths = [
  '.artifacts',
  'dist',
  '.codex-vite.log',
  '.codex-vite.err.log',
  'supabase/.temp',
]

const skippedPaths = []

for (const generatedPath of generatedPaths) {
  try {
    await rm(new URL(generatedPath, repositoryRootUrl), {
      force: true,
      recursive: true,
    })
  } catch (error) {
    const isLockedLog =
      error instanceof Error &&
      'code' in error &&
      (error.code === 'EBUSY' || error.code === 'EPERM') &&
      generatedPath.endsWith('.log')

    if (!isLockedLog) {
      throw error
    }

    skippedPaths.push(generatedPath)
  }
}

console.log(`Cleaned generated files from ${fileURLToPath(repositoryRootUrl)}`)
if (skippedPaths.length > 0) {
  console.warn(`Skipped files in use: ${skippedPaths.join(', ')}`)
}

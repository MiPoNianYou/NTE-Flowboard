export type LegacyStorageMigrationResult =
  'none' | 'migrated' | 'cleaned' | 'conflict' | 'invalid-legacy' | 'recovered' | 'failed'

export function removeStorageKey(storage: Storage, key: string): boolean {
  try {
    storage.removeItem(key)
    return storage.getItem(key) === null
  } catch {
    return false
  }
}

interface LegacyStorageMigrationOptions<T> {
  legacyKey: string
  currentKey: string
  parse: (raw: string) => T | null
  serialize?: (value: T) => string
  equals?: (left: T, right: T) => boolean
  corruptedBackupKey?: string
  onConflict?: (legacyKey: string, currentKey: string) => void
  onFailure?: (legacyKey: string, currentKey: string) => void
}

export function migrateLegacyStorageValue<T>(
  storage: Storage,
  {
    legacyKey,
    currentKey,
    parse,
    serialize = (value) => String(value),
    equals = (left, right) => JSON.stringify(left) === JSON.stringify(right),
    corruptedBackupKey,
    onConflict,
    onFailure,
  }: LegacyStorageMigrationOptions<T>,
): LegacyStorageMigrationResult {
  const tryParse = (raw: string): T | null => {
    try {
      return parse(raw)
    } catch {
      return null
    }
  }
  const fail = (): LegacyStorageMigrationResult => {
    onFailure?.(legacyKey, currentKey)
    return 'failed'
  }

  try {
    const legacyRaw = storage.getItem(legacyKey)
    if (legacyRaw === null) return 'none'

    const legacyValue = tryParse(legacyRaw)
    if (legacyValue === null)
      return removeStorageKey(storage, legacyKey) ? 'invalid-legacy' : fail()

    const currentRaw = storage.getItem(currentKey)
    if (currentRaw !== null) {
      const currentValue = tryParse(currentRaw)
      if (currentValue !== null) {
        if (!equals(currentValue, legacyValue)) {
          onConflict?.(legacyKey, currentKey)
          return 'conflict'
        }
        return removeStorageKey(storage, legacyKey) ? 'cleaned' : fail()
      }
      const backupKey = corruptedBackupKey ?? `${currentKey}-corrupted-backup`
      storage.setItem(backupKey, currentRaw)
      if (storage.getItem(backupKey) !== currentRaw) return fail()
    }

    storage.setItem(currentKey, serialize(legacyValue))
    const confirmedRaw = storage.getItem(currentKey)
    const confirmed = confirmedRaw === null ? null : tryParse(confirmedRaw)
    if (confirmed === null || !equals(confirmed, legacyValue)) return fail()

    if (!removeStorageKey(storage, legacyKey)) return fail()
    return currentRaw === null ? 'migrated' : 'recovered'
  } catch {
    return fail()
  }
}

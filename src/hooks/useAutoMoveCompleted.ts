import { useLocalStorageBoolean } from './useLocalStorageBoolean'

export function useAutoMoveCompleted() {
  const { value: autoMoveCompleted, onChange: onAutoMoveCompletedChange } =
    useLocalStorageBoolean('nte-auto-move-completed')

  return { autoMoveCompleted, onAutoMoveCompletedChange }
}

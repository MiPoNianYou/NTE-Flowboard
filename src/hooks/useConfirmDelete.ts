import { useLocalStorageBoolean } from './useLocalStorageBoolean'

export function useConfirmDelete() {
  const { value: confirmDelete, onChange: onConfirmDeleteChange } =
    useLocalStorageBoolean('nte-confirm-delete')

  return { confirmDelete, onConfirmDeleteChange }
}

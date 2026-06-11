import { useLocalStorageBoolean } from './useLocalStorageBoolean'

export function useShowCustomTab() {
  const { value: showCustomTab, onChange: onShowCustomTabChange } =
    useLocalStorageBoolean('nte-show-custom-tab')

  return { showCustomTab, onShowCustomTabChange }
}

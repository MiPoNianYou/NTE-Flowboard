interface ToggleSwitchProps {
  checked: boolean
  onCheckedChange: (newVal: boolean) => void
}

export function ToggleSwitch({ checked, onCheckedChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
      style={{
        backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-elevated)',
        borderWidth: '1px',
        borderColor: checked ? 'var(--color-primary)' : 'var(--color-border-strong)',
      }}
    >
      <span
        style={{
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
          backgroundColor: checked ? '#FFFFFF' : 'var(--color-text-secondary)',
        }}
        className="pointer-events-none inline-block h-3.5 w-3.5 rounded-full transition-transform duration-150"
      />
    </button>
  )
}

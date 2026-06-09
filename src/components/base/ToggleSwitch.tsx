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
      className="relative shrink-0 cursor-pointer transition-colors duration-[400ms] focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '5px',
        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)',
        backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-elevated)',
        borderWidth: '1px',
        borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: '1.5px',
          height: '16px',
          left: '4px',
          bottom: '2px',
          backgroundColor: '#FFFFFF',
          transform: checked
            ? 'translateX(28.5px) rotate(360deg)'
            : 'none',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  )
}

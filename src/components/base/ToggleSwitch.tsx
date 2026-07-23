import { cn } from '../../utils/cn'

interface ToggleSwitchProps {
  checked: boolean
  onCheckedChange: (newValue: boolean) => void
}

export function ToggleSwitch({ checked, onCheckedChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative shrink-0 w-[42px] h-[24px] rounded-full cursor-pointer',
        'border border-border',
        'backdrop-blur-sm transition-colors duration-200',
        'focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]',
        checked
          ? 'bg-primary shadow-[0_0_12px_var(--color-primary-glow)]'
          : 'bg-surface hover:bg-surface-hover',
      )}
    >
      <span
        className={cn(
          'absolute w-[20px] h-[20px] left-[1px] top-[1px]',
          'bg-[var(--color-text-on-accent)] rounded-full shadow-sm',
          'transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          checked && 'translate-x-[18px]',
        )}
      />
    </button>
  )
}

import { cn } from '../../utils/cn'

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
      className={cn(
        'relative shrink-0 w-[40px] h-[22px] rounded-[5px] border cursor-pointer',
        'shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]',
        'transition-colors duration-[400ms]',
        'focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]',
        checked
          ? 'bg-primary border-primary'
          : 'bg-elevated border-border',
      )}
    >
      <span
        className={cn(
          'absolute w-[1.5px] h-4 left-1 bottom-0.5',
          'bg-white rounded-full',
          'transition-transform duration-[400ms] [cubic-bezier(0.4,0,0.2,1)]',
          checked && 'translate-x-[28.5px] rotate-[360deg]',
        )}
      />
    </button>
  )
}

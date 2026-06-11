import type { MouseEvent } from 'react'
import { Pencil, Trash2, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../base/Button'

interface DesktopActionsProps {
  onEdit: () => void
  onHide: () => void
  onDelete: (e: MouseEvent) => void
  isPending: boolean
}

export function DesktopActions({ onEdit, onHide, onDelete, isPending }: DesktopActionsProps) {
  return (
    <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-[opacity]">
      <Button
        variant="tertiary"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className="p-1.5 hover:bg-primary-soft hover:text-primary"
      >
        <Pencil size={15} />
      </Button>
      <Button
        variant="tertiary"
        onClick={(e) => { e.stopPropagation(); onHide() }}
        className="p-1.5 hover:bg-warning-soft hover:text-warning"
      >
        <EyeOff size={15} />
      </Button>
      <Button
        variant="tertiary"
        onClick={onDelete}
        className={cn(
          'p-1.5 hover:bg-danger-soft hover:text-danger',
          isPending && 'text-white bg-danger hover:bg-danger hover:text-white',
        )}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  )
}

import { Pencil, Trash2, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'
import { Button } from '../base/Button'
import type { ItemActionProps } from './DesktopActions'

interface MobileActionsProps extends ItemActionProps {
  isExpanded: boolean
}

export function MobileActions({
  onEdit,
  onHide,
  onDelete,
  isPending,
  isExpanded,
}: MobileActionsProps) {
  return (
    <div className={cn(GRID_COLLAPSE, isExpanded ? 'collapse-open' : 'collapse-closed')}>
      <div className="overflow-hidden">
        <div className="grid grid-cols-3 gap-2 px-3 pb-3 pt-2">
          <Button variant="primary-soft" onClick={onEdit} className="h-10 px-2 text-xs">
            <Pencil size={13} />
            <span>编辑</span>
          </Button>
          <Button
            variant="warning-soft"
            onClick={(event) => {
              event.stopPropagation()
              onHide()
            }}
            className="h-10 px-2 text-xs"
          >
            <EyeOff size={13} />
            <span>隐藏</span>
          </Button>
          <Button
            variant={isPending ? 'danger' : 'danger-soft'}
            onClick={onDelete}
            className="h-10 px-2 text-xs"
          >
            <Trash2 size={13} />
            <span>{isPending ? '确认删除' : '删除'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

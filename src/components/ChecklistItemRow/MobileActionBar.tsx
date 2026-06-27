import { Pencil, Trash2, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'
import { Button } from '../base/Button'
import type { ItemActionProps } from './DesktopActions'

interface MobileActionBarProps extends ItemActionProps {
  isExpanded: boolean
}

export function MobileActionBar({
  onEdit,
  onHide,
  onDelete,
  isPending,
  isExpanded,
}: MobileActionBarProps) {
  return (
    <div className={cn(GRID_COLLAPSE, isExpanded ? 'collapse-open' : 'collapse-closed')}>
      <div className="overflow-hidden">
        <div className="flex items-center justify-end gap-1 pb-1 pt-1 px-1">
          <Button
            variant="primary-soft"
            onClick={onEdit}
            className="px-2 py-1.5 text-xs justify-center"
          >
            <Pencil size={13} />
            <span>编辑</span>
          </Button>
          <Button
            variant="warning-soft"
            onClick={(event) => {
              event.stopPropagation()
              onHide()
            }}
            className="px-2 py-1.5 text-xs justify-center"
          >
            <EyeOff size={13} />
            <span>隐藏</span>
          </Button>
          <Button
            variant="danger"
            onClick={onDelete}
            className={cn(
              'px-2 py-1.5 text-xs justify-center',
              !isPending && 'text-text-muted hover:text-danger',
            )}
          >
            <Trash2 size={13} />
            <span>{isPending ? '确认' : '删除'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

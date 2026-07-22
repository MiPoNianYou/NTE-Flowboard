import { Pencil, Trash2, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'
import { Button } from '../base/Button'
import type { ItemActionProps } from './DesktopActions'

interface MobileActionsProps extends ItemActionProps {
  isExpanded: boolean
}

export const MOBILE_ACTION_LAYOUT = {
  bar: 'grid grid-cols-3 gap-2 px-3 pb-3 pt-2',
  button: 'h-10 px-2 text-xs max-[419px]:px-0',
  content: 'max-[419px]:gap-1',
  icon: 'max-[419px]:size-3',
  label: 'whitespace-nowrap max-[419px]:text-[10px]',
} as const

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
        <div className={MOBILE_ACTION_LAYOUT.bar}>
          <Button
            variant="primary-soft"
            onClick={onEdit}
            className={MOBILE_ACTION_LAYOUT.button}
            contentClassName={MOBILE_ACTION_LAYOUT.content}
          >
            <Pencil size={13} className={MOBILE_ACTION_LAYOUT.icon} />
            <span className={MOBILE_ACTION_LAYOUT.label}>编辑</span>
          </Button>
          <Button
            variant="warning-soft"
            onClick={(event) => {
              event.stopPropagation()
              onHide()
            }}
            className={MOBILE_ACTION_LAYOUT.button}
            contentClassName={MOBILE_ACTION_LAYOUT.content}
          >
            <EyeOff size={13} className={MOBILE_ACTION_LAYOUT.icon} />
            <span className={MOBILE_ACTION_LAYOUT.label}>隐藏</span>
          </Button>
          <Button
            variant={isPending ? 'danger' : 'danger-soft'}
            onClick={onDelete}
            className={MOBILE_ACTION_LAYOUT.button}
            contentClassName={MOBILE_ACTION_LAYOUT.content}
          >
            <Trash2 size={13} className={MOBILE_ACTION_LAYOUT.icon} />
            <span className={MOBILE_ACTION_LAYOUT.label}>{isPending ? '确认删除' : '删除'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

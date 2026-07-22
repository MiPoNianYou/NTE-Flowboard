import { Pencil, Trash2, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'
import { Button } from '../base/Button'
import type { ItemActionProps } from './DesktopActions'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div
      className={cn(GRID_COLLAPSE, isExpanded ? 'collapse-open' : 'collapse-closed')}
      aria-hidden={!isExpanded}
      inert={!isExpanded}
    >
      <div className="overflow-hidden">
        <div className={MOBILE_ACTION_LAYOUT.bar}>
          <Button
            variant="primary-soft"
            onClick={onEdit}
            tabIndex={isExpanded ? 0 : -1}
            className={MOBILE_ACTION_LAYOUT.button}
            contentClassName={MOBILE_ACTION_LAYOUT.content}
          >
            <Pencil size={13} className={MOBILE_ACTION_LAYOUT.icon} />
            <span className={MOBILE_ACTION_LAYOUT.label}>{t('common.edit')}</span>
          </Button>
          <Button
            variant="warning-soft"
            onClick={(event) => {
              event.stopPropagation()
              onHide()
            }}
            tabIndex={isExpanded ? 0 : -1}
            className={MOBILE_ACTION_LAYOUT.button}
            contentClassName={MOBILE_ACTION_LAYOUT.content}
          >
            <EyeOff size={13} className={MOBILE_ACTION_LAYOUT.icon} />
            <span className={MOBILE_ACTION_LAYOUT.label}>{t('common.hide')}</span>
          </Button>
          <Button
            variant={isPending ? 'danger' : 'danger-soft'}
            onClick={onDelete}
            tabIndex={isExpanded ? 0 : -1}
            className={MOBILE_ACTION_LAYOUT.button}
            contentClassName={MOBILE_ACTION_LAYOUT.content}
          >
            <Trash2 size={13} className={MOBILE_ACTION_LAYOUT.icon} />
            <span className={MOBILE_ACTION_LAYOUT.label}>
              {isPending ? t('common.confirmDelete') : t('common.delete')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

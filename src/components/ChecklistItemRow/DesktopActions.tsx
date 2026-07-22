import { Pencil, Trash2, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import {
  ACTION_HOVER_PRIMARY,
  ACTION_HOVER_WARNING,
  ACTION_HOVER_DANGER,
  PENDING_DELETE_STYLE,
} from '../../utils/stylePresets'
import { Button } from '../base/Button'
import { useTranslation } from 'react-i18next'

export interface ItemActionProps {
  onEdit: () => void
  onHide: () => void
  onDelete: (event: React.MouseEvent) => void
  isPending: boolean
}

export function DesktopActions({ onEdit, onHide, onDelete, isPending }: ItemActionProps) {
  const { t } = useTranslation()
  return (
    <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <Button
        variant="tertiary"
        onClick={(event) => {
          event.stopPropagation()
          onEdit()
        }}
        className={cn('w-8 h-8 px-0 py-0', ACTION_HOVER_PRIMARY)}
        aria-label={t('common.edit')}
      >
        <Pencil size={15} />
      </Button>
      <Button
        variant="tertiary"
        onClick={(event) => {
          event.stopPropagation()
          onHide()
        }}
        className={cn('w-8 h-8 px-0 py-0', ACTION_HOVER_WARNING)}
        aria-label={t('common.hide')}
      >
        <EyeOff size={15} />
      </Button>
      <Button
        variant="tertiary"
        onClick={onDelete}
        className={cn('w-8 h-8 px-0 py-0', ACTION_HOVER_DANGER, isPending && PENDING_DELETE_STYLE)}
        aria-label={isPending ? t('common.confirmDelete') : t('common.delete')}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  )
}

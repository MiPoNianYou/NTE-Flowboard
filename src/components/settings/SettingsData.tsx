import { type ChangeEvent, type RefObject, useState, useRef, useCallback, useEffect } from 'react'
import {
  Download,
  Upload,
  RotateCcw,
  CircleX,
  CircleCheck,
  TriangleAlert,
  Undo2,
} from 'lucide-react'
import type { TabType } from '../../types'
import type { SettingsPageBaseProps } from './SettingsPage'
import { SettingsPage } from './SettingsPage'
import { Card } from '../base/Card'
import { Button } from '../base/Button'
import { CollapsibleSection } from '../base/CollapsibleSection'
import { StatusMessage } from '../base/StatusMessage'
import { MS } from '../../utils/constants'
import { useTranslation } from 'react-i18next'
import type { RestoreDefaultsControls } from '../../utils/checklistRestoreBackup'

interface SettingsDataProps extends SettingsPageBaseProps {
  onManualReset: (tab: TabType) => void
  restoreDefaultsControls: RestoreDefaultsControls
  isCloudConfigured: boolean
  onExport: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  isImportError: boolean
  isImportSuccess: boolean
  isExportSuccess: boolean
  mobile?: boolean
}

type ResetTarget = TabType | 'defaults' | 'undo'
type RestoreOperation = 'restore' | 'undo'
type RestoreFailure =
  'restore-backup' | 'restore-persistence' | 'undo-missing' | 'undo-persistence' | 'undo-cleanup'

function useTimedStateSet<T extends string>(timeout: number) {
  const [items, setItems] = useState<Set<T>>(new Set())
  const ref = useRef<Set<T>>(new Set())
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({})

  const add = useCallback(
    (key: T) => {
      clearTimeout(timersRef.current[key])
      ref.current.add(key)
      setItems(new Set(ref.current))
      timersRef.current[key] = setTimeout(() => {
        ref.current.delete(key)
        setItems(new Set(ref.current))
      }, timeout)
    },
    [timeout],
  )

  const remove = useCallback((key: T) => {
    clearTimeout(timersRef.current[key])
    timersRef.current[key] = undefined
    ref.current.delete(key)
    setItems(new Set(ref.current))
  }, [])

  const has = useCallback((key: T) => ref.current.has(key), [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  return { items, add, remove, has }
}

export function SettingsData({
  onManualReset,
  restoreDefaultsControls,
  isCloudConfigured,
  onExport,
  onImportFile,
  fileInputRef,
  isImportError,
  isImportSuccess,
  isExportSuccess,
  onBack,
  isEmbedded,
  mobile = false,
}: SettingsDataProps) {
  const { onRestoreDefaults, onUndoRestoreDefaults, hasRestoreBackup, hasChangesSinceRestore } =
    restoreDefaultsControls
  const { t } = useTranslation()
  const confirming = useTimedStateSet<ResetTarget>(3000)
  const resetDone = useTimedStateSet<ResetTarget>(MS.SUCCESS_HINT)
  const operationError = useTimedStateSet<RestoreFailure>(MS.TOAST_DISMISS)
  const [pendingOperation, setPendingOperation] = useState<RestoreOperation | null>(null)

  const handleResetClick = useCallback(
    (target: TabType) => {
      if (resetDone.has(target)) return
      if (confirming.has(target)) {
        confirming.remove(target)
        onManualReset(target)
        resetDone.add(target)
      } else {
        confirming.add(target)
      }
    },
    [confirming, resetDone, onManualReset],
  )

  const handleRestoreDefaultsClick = useCallback(async () => {
    if (resetDone.has('defaults') || pendingOperation) return
    if (confirming.has('defaults')) {
      confirming.remove('defaults')
      setPendingOperation('restore')
      const result = await onRestoreDefaults()
      setPendingOperation(null)
      operationError.remove('restore-backup')
      operationError.remove('restore-persistence')
      if (result === 'success') {
        resetDone.add('defaults')
      } else {
        operationError.add(result === 'backup-failed' ? 'restore-backup' : 'restore-persistence')
      }
    } else {
      confirming.add('defaults')
    }
  }, [confirming, operationError, onRestoreDefaults, pendingOperation, resetDone])

  const handleUndoRestoreClick = useCallback(async () => {
    if (resetDone.has('undo') || pendingOperation) return
    if (hasChangesSinceRestore && !confirming.has('undo')) {
      confirming.add('undo')
      return
    }

    confirming.remove('undo')
    setPendingOperation('undo')
    const result = await onUndoRestoreDefaults(hasChangesSinceRestore)
    setPendingOperation(null)
    operationError.remove('undo-missing')
    operationError.remove('undo-persistence')
    operationError.remove('undo-cleanup')
    if (result === 'success') {
      resetDone.add('undo')
    } else if (result === 'changes-detected') {
      confirming.add('undo')
    } else {
      const failure: RestoreFailure =
        result === 'backup-missing' || result === 'conflict'
          ? 'undo-missing'
          : result === 'cleanup-failed'
            ? 'undo-cleanup'
            : 'undo-persistence'
      operationError.add(failure)
    }
  }, [
    confirming,
    hasChangesSinceRestore,
    onUndoRestoreDefaults,
    operationError,
    pendingOperation,
    resetDone,
  ])

  const isRestoreConfirming = confirming.items.has('defaults')
  const isUndoConfirming = confirming.items.has('undo')
  const isRestoreDone = resetDone.items.has('defaults')
  const isUndoDone = resetDone.items.has('undo')
  const restoreDefaultsSection = (
    <CollapsibleSection
      icon={<RotateCcw className="size-4 text-danger" aria-hidden="true" />}
      label={t('settings.data.restoreDefaults')}
    >
      <div className={`space-y-3 pb-3 ${mobile ? 'px-3' : 'px-4'}`}>
        <StatusMessage
          tone={isCloudConfigured ? 'danger' : 'warning'}
          mode="callout"
          icon={<TriangleAlert className="size-4" aria-hidden="true" />}
        >
          {`${t('settings.data.restoreWarning')}${
            isCloudConfigured ? `\n${t('settings.data.restoreCloudWarning')}` : ''
          }`}
        </StatusMessage>

        {operationError.items.has('restore-backup') && (
          <StatusMessage tone="danger" mode="banner">
            {t('settings.data.restoreBackupFailed')}
          </StatusMessage>
        )}
        {operationError.items.has('restore-persistence') && (
          <StatusMessage tone="danger" mode="banner">
            {t('settings.data.restorePersistenceFailed')}
          </StatusMessage>
        )}

        <Button
          variant={isRestoreDone ? 'success-soft' : isRestoreConfirming ? 'danger' : 'danger-soft'}
          onClick={handleRestoreDefaultsClick}
          isLoading={pendingOperation === 'restore'}
          data-restore-defaults-action
          className="w-full h-14 min-h-0 justify-start py-1"
        >
          <RotateCcw className="size-4" />
          <div className="text-left">
            <p>
              {isRestoreDone
                ? t('settings.data.restoreDefaultsSuccess')
                : isRestoreConfirming
                  ? t('settings.data.confirmRestoreDefaults')
                  : t('settings.data.restoreDefaults')}
            </p>
          </div>
        </Button>

        {(hasRestoreBackup || isUndoDone) && (
          <div className="space-y-2">
            {hasRestoreBackup && hasChangesSinceRestore && (
              <StatusMessage tone="danger" mode="banner">
                {t('settings.data.undoChangesWarning')}
              </StatusMessage>
            )}
            {operationError.items.has('undo-missing') && (
              <StatusMessage tone="danger" mode="banner">
                {t('settings.data.undoBackupFailed')}
              </StatusMessage>
            )}
            {operationError.items.has('undo-persistence') && (
              <StatusMessage tone="danger" mode="banner">
                {t('settings.data.undoPersistenceFailed')}
              </StatusMessage>
            )}
            {operationError.items.has('undo-cleanup') && (
              <StatusMessage tone="danger" mode="banner">
                {t('settings.data.undoCleanupFailed')}
              </StatusMessage>
            )}
            <Button
              variant={isUndoDone ? 'success-soft' : isUndoConfirming ? 'danger' : 'warning-soft'}
              onClick={handleUndoRestoreClick}
              isLoading={pendingOperation === 'undo'}
              data-undo-restore-action
              className="w-full h-14 min-h-0 justify-start py-1"
            >
              {isUndoDone ? <CircleCheck className="size-4" /> : <Undo2 className="size-4" />}
              <div className="text-left">
                <p>
                  {isUndoDone
                    ? t('settings.data.undoRestoreSuccess')
                    : isUndoConfirming
                      ? t('settings.data.confirmUndoRestore')
                      : t('settings.data.undoRestore')}
                </p>
              </div>
            </Button>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )

  return (
    <SettingsPage title={t('settings.nav.data')} onBack={onBack} isEmbedded={isEmbedded}>
      <div className={mobile ? 'space-y-5' : 'space-y-4'}>
        <Card variant="surface" className={mobile ? 'px-3 py-3 space-y-2' : 'px-4 py-3 space-y-3'}>
          {(['daily', 'weekly', 'monthly'] as TabType[]).map((tab) => {
            const isResetDone = resetDone.items.has(tab)
            const isConfirming = confirming.items.has(tab)
            return (
              <Button
                key={tab}
                variant={
                  isResetDone ? 'success-soft' : isConfirming ? 'danger-soft' : 'warning-soft'
                }
                onClick={() => handleResetClick(tab)}
                className="w-full h-14 min-h-0 justify-start py-1"
              >
                <RotateCcw className="size-4" />
                <div className="text-left">
                  <p>
                    {isResetDone
                      ? t(`settings.data.success${tab[0].toUpperCase()}${tab.slice(1)}`)
                      : isConfirming
                        ? t(`settings.data.confirm${tab[0].toUpperCase()}${tab.slice(1)}`)
                        : t(`settings.data.reset${tab[0].toUpperCase()}${tab.slice(1)}`)}
                  </p>
                </div>
              </Button>
            )
          })}
        </Card>
        <Card variant="surface" className={mobile ? 'px-3 py-3 space-y-2' : 'px-4 py-3 space-y-3'}>
          {isExportSuccess ? (
            <Button variant="success-soft" className="w-full h-14 min-h-0 justify-start py-1">
              <CircleCheck className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.exportSuccess')}</p>
                <p className="text-xs font-normal text-text-secondary">
                  {t('settings.data.exportSuccessDetail')}
                </p>
              </div>
            </Button>
          ) : (
            <Button
              variant="info-soft"
              onClick={onExport}
              className="w-full h-14 min-h-0 justify-start py-1"
            >
              <Download className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.export')}</p>
                <p className="text-xs font-normal text-text-secondary">
                  {t('settings.data.exportDetail')}
                </p>
              </div>
            </Button>
          )}
          {isImportSuccess ? (
            <Button variant="success-soft" className="w-full h-14 min-h-0 justify-start py-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
              <CircleCheck className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.importSuccess')}</p>
                <p className="text-xs font-normal text-text-secondary">
                  {t('settings.data.importSuccessDetail')}
                </p>
              </div>
            </Button>
          ) : isImportError ? (
            <Button
              variant="danger-soft"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-14 min-h-0 justify-start py-1"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
              <CircleX className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.fileError')}</p>
                <p className="text-xs font-normal text-text-secondary">
                  {t('settings.data.fileErrorDetail')}
                </p>
              </div>
            </Button>
          ) : (
            <Button
              variant="info-soft"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-14 min-h-0 justify-start py-1"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
              <Upload className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.import')}</p>
                <p className="text-xs font-normal text-text-secondary">
                  {t('settings.data.importDetail')}
                </p>
              </div>
            </Button>
          )}
        </Card>
        {restoreDefaultsSection}
      </div>
    </SettingsPage>
  )
}

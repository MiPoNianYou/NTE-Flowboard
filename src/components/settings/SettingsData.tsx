import { type ChangeEvent, type RefObject, useState, useRef, useCallback, useEffect } from 'react'
import { Download, Upload, RotateCcw, CircleX, CircleCheck } from 'lucide-react'
import type { TabType } from '../../types'
import type { SettingsPageBaseProps } from './SettingsPage'
import { SettingsPage } from './SettingsPage'
import { Card } from '../base/Card'
import { Button } from '../base/Button'
import { MS } from '../../utils/constants'
import { useTranslation } from 'react-i18next'

interface SettingsDataProps extends SettingsPageBaseProps {
  onManualReset: (tab: TabType) => void
  onExport: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  isImportError: boolean
  isImportSuccess: boolean
  isExportSuccess: boolean
}

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
  onExport,
  onImportFile,
  fileInputRef,
  isImportError,
  isImportSuccess,
  isExportSuccess,
  onBack,
  isEmbedded,
}: SettingsDataProps) {
  const { t } = useTranslation()
  const confirming = useTimedStateSet<TabType>(3000)
  const resetDone = useTimedStateSet<TabType>(MS.SUCCESS_HINT)

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

  return (
    <SettingsPage title={t('settings.nav.data')} onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-4">
        <Card variant="surface" className="px-4 py-3 space-y-3">
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
                className="w-full justify-start py-4"
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
        <Card variant="surface" className="px-4 py-3 space-y-3">
          {isExportSuccess ? (
            <Button
              variant="success-soft"
              onClick={() => {
                return
              }}
              className="w-full justify-start"
            >
              <CircleCheck className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.exportSuccess')}</p>
                <p className="text-xs font-normal opacity-70">
                  {t('settings.data.exportSuccessDetail')}
                </p>
              </div>
            </Button>
          ) : (
            <Button variant="info-soft" onClick={onExport} className="w-full justify-start">
              <Download className="size-4" />
              <div className="text-left">
                <p>{t('settings.data.export')}</p>
                <p className="text-xs font-normal opacity-70">{t('settings.data.exportDetail')}</p>
              </div>
            </Button>
          )}
          {isImportSuccess ? (
            <Button
              variant="success-soft"
              onClick={() => {
                return
              }}
              className="w-full justify-start"
            >
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
                <p className="text-xs font-normal opacity-70">
                  {t('settings.data.importSuccessDetail')}
                </p>
              </div>
            </Button>
          ) : isImportError ? (
            <Button
              variant="danger-soft"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start"
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
                <p className="text-xs font-normal opacity-70">
                  {t('settings.data.fileErrorDetail')}
                </p>
              </div>
            </Button>
          ) : (
            <Button
              variant="info-soft"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start"
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
                <p className="text-xs font-normal opacity-70">{t('settings.data.importDetail')}</p>
              </div>
            </Button>
          )}
        </Card>
      </div>
    </SettingsPage>
  )
}

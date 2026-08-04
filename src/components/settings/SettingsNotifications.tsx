import {
  Bell,
  BellOff,
  BellRing,
  Clock3,
  MonitorCheck,
  RotateCw,
  Send,
  ShieldAlert,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NotificationLeadHours, NotificationSettingsProps } from '../../types'
import { NOTIFICATION_LEAD_HOURS } from '../../utils/notificationPreferences'
import { cn } from '../../utils/cn'
import { Button } from '../base/Button'
import { Card } from '../base/Card'
import { StatusMessage } from '../base/StatusMessage'
import { ToggleSwitch } from '../base/ToggleSwitch'
import { SettingRow } from './SettingRow'
import { SettingsPage, type SettingsPageBaseProps } from './SettingsPage'

interface SettingsNotificationsProps extends SettingsPageBaseProps {
  notification: NotificationSettingsProps
}

const LEAD_TIME_SEGMENTED_CONTROL =
  'grid w-full basis-full grid-cols-4 rounded-control border border-border bg-elevated p-0.5 mt-3'

export function SettingsNotifications({
  notification,
  onBack,
  isEmbedded,
}: SettingsNotificationsProps) {
  const { t } = useTranslation()
  const isEnabled = notification.status === 'enabled'
  const isBusy = notification.status === 'checking' || notification.status === 'enabling'
  const errorKey = notification.error
  const testDescription = notification.testFailed
    ? t('notifications.errors.NOTIFICATION_TEST_FAILED')
    : notification.lastTestSucceeded
      ? t('notifications.testSuccess')
      : t('notifications.testDescription')

  return (
    <SettingsPage title={t('settings.nav.notifications')} onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-5">
        <section>
          <Card variant="surface" className="p-0 overflow-hidden divide-y divide-border">
            <SettingRow
              icon={isEnabled ? BellRing : Bell}
              label={t(`notifications.status.${notification.status}`)}
              description={t('notifications.deviceScope')}
              trailing={
                isEnabled ? (
                  <Button variant="tertiary" onClick={() => void notification.disable()}>
                    <BellOff className="size-4" aria-hidden="true" />
                    {t('notifications.disable')}
                  </Button>
                ) : notification.status === 'denied' ? (
                  <Button variant="tertiary" onClick={() => void notification.refresh()}>
                    <RotateCw className="size-4" aria-hidden="true" />
                    {t('notifications.recheck')}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    isLoading={isBusy}
                    disabled={notification.status === 'unsupported'}
                    onClick={() => void notification.enable()}
                  >
                    <BellRing className="size-4" aria-hidden="true" />
                    {t('notifications.enable')}
                  </Button>
                )
              }
              className="px-4 py-3 flex-wrap gap-3"
            />
            {isEnabled && (
              <SettingRow
                icon={MonitorCheck}
                label={t('notifications.testTitle')}
                description={testDescription}
                descriptionClassName={
                  notification.testFailed
                    ? 'text-danger'
                    : notification.lastTestSucceeded
                      ? 'text-success'
                      : undefined
                }
                trailing={
                  <Button
                    variant="secondary"
                    contentClassName="tabular-nums whitespace-nowrap"
                    disabled={notification.isTestSending || notification.testCountdownSeconds > 0}
                    onClick={() => void notification.sendTest()}
                  >
                    <Send className="size-4" aria-hidden="true" />
                    {notification.isTestSending && notification.testCountdownSeconds > 0
                      ? t('notifications.testPending', {
                          count: notification.testCountdownSeconds,
                        })
                      : notification.isTestSending
                        ? t('notifications.testSending')
                        : notification.testCountdownSeconds > 0
                          ? t('notifications.testCooldown', {
                              count: notification.testCountdownSeconds,
                            })
                          : t('notifications.sendTest')}
                  </Button>
                }
                className="px-4 py-3 flex-wrap gap-3"
              />
            )}
          </Card>
        </section>

        {notification.status === 'denied' && (
          <StatusMessage
            tone="warning"
            mode="callout"
            icon={<ShieldAlert className="size-4" aria-hidden="true" />}
          >
            {t('notifications.permissionDenied')}
          </StatusMessage>
        )}

        {errorKey && (
          <StatusMessage tone="danger" mode="banner">
            {t(`notifications.errors.${errorKey}`)}
          </StatusMessage>
        )}

        <section className="space-y-2">
          <h3 className="px-1 text-xs font-semibold text-text-secondary">
            {t('notifications.rules')}
          </h3>
          <Card variant="surface" className="p-0 overflow-hidden divide-y divide-border">
            <SettingRow
              icon={BellRing}
              label={t('notifications.atReset')}
              description={t('notifications.atResetDescription')}
              trailing={
                <ToggleSwitch
                  checked={notification.preferences.resetEnabled}
                  disabled={!isEnabled}
                  onCheckedChange={(value) =>
                    notification.updatePreferences({ resetEnabled: value })
                  }
                  aria-label={t('notifications.atReset')}
                />
              }
              className={!isEnabled ? 'px-4 py-3 opacity-50 pointer-events-none' : 'px-4 py-3'}
            />
            <SettingRow
              icon={Bell}
              label={t('notifications.beforeReset')}
              description={t('notifications.beforeResetDescription')}
              trailing={
                <ToggleSwitch
                  checked={notification.preferences.beforeResetEnabled}
                  disabled={!isEnabled}
                  onCheckedChange={(value) =>
                    notification.updatePreferences({ beforeResetEnabled: value })
                  }
                  aria-label={t('notifications.beforeReset')}
                />
              }
              className={!isEnabled ? 'px-4 py-3 opacity-50 pointer-events-none' : 'px-4 py-3'}
            />
            {isEnabled && notification.preferences.beforeResetEnabled && (
              <SettingRow
                icon={Clock3}
                label={t('notifications.leadTime')}
                description={t('notifications.allCycles')}
                trailing={
                  <div
                    role="group"
                    aria-label={t('notifications.leadTime')}
                    className={LEAD_TIME_SEGMENTED_CONTROL}
                  >
                    {NOTIFICATION_LEAD_HOURS.map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() =>
                          notification.updatePreferences({
                            leadHours: hours as NotificationLeadHours,
                          })
                        }
                        aria-pressed={notification.preferences.leadHours === hours}
                        className={cn(
                          'min-w-0 rounded-compact px-1 py-1 text-[13px] sm:text-xs transition-colors duration-150',
                          notification.preferences.leadHours === hours
                            ? 'bg-primary text-[var(--color-text-on-accent)]'
                            : 'text-text-secondary hover:text-text-primary',
                        )}
                      >
                        {t('notifications.hours', { count: hours })}
                      </button>
                    ))}
                  </div>
                }
                className="px-4 py-3 flex-wrap"
              />
            )}
          </Card>
        </section>
      </div>
    </SettingsPage>
  )
}

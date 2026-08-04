import type { Cycle, Locale, PushPayload, SubscriptionRow } from './types.ts'
import type { ScheduledNotification } from './schedule.ts'

const CYCLE_NAMES: Record<Locale, Record<Cycle, string>> = {
  'zh-CN': { daily: '每日', weekly: '每周', monthly: '每月' },
  'en-US': { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' },
}

export function buildScheduledPayload(
  notification: ScheduledNotification,
  locale: Locale,
  subscription: Pick<SubscriptionRow, 'endpoint' | 'before_reset_revision' | 'reset_revision'>,
): PushPayload {
  const names = notification.cycles.map((cycle) => CYCLE_NAMES[locale][cycle])
  if (notification.type === 'reset') {
    return {
      title: 'NTE Flowboard',
      body:
        locale === 'zh-CN'
          ? `${joinChinese(names)}事项已重置`
          : `${joinEnglish(names)} tasks have reset`,
      tag: 'flowboard-reset',
      expiresAt: notification.expiresAt.toISOString(),
      issuedAt: new Date().toISOString(),
      notificationType: 'reset',
      locale,
      cycles: notification.cycles,
      subscriptionId: subscription.endpoint,
      ruleRevisions: {
        beforeReset: subscription.before_reset_revision,
        reset: subscription.reset_revision,
      },
      cycleExpiresAt: Object.fromEntries(
        notification.cycles.map((cycle) => [
          cycle,
          notification.cycleExpiresAt[cycle]?.toISOString() ?? notification.expiresAt.toISOString(),
        ]),
      ),
    }
  }

  return {
    title: 'NTE Flowboard',
    body:
      locale === 'zh-CN'
        ? `${joinChinese(names)}还有未完成事项，请在重置前完成`
        : `${joinEnglish(names)} tasks are still incomplete. Finish them before the reset.`,
    tag: 'flowboard-before-reset',
    expiresAt: notification.expiresAt.toISOString(),
    issuedAt: new Date().toISOString(),
    notificationType: 'before-reset',
    locale,
    cycles: notification.cycles,
    subscriptionId: subscription.endpoint,
    ruleRevisions: {
      beforeReset: subscription.before_reset_revision,
      reset: subscription.reset_revision,
    },
    cycleExpiresAt: Object.fromEntries(
      notification.cycles.map((cycle) => [
        cycle,
        notification.cycleExpiresAt[cycle]?.toISOString() ?? notification.expiresAt.toISOString(),
      ]),
    ),
  }
}

export function buildTestPayload(
  locale: Locale,
  expiresAt: Date,
  subscription: Pick<SubscriptionRow, 'endpoint' | 'before_reset_revision' | 'reset_revision'>,
): PushPayload {
  return {
    title: 'NTE Flowboard',
    body: locale === 'zh-CN' ? '测试通知已送达' : 'Test notification delivered.',
    tag: 'flowboard-test',
    expiresAt: expiresAt.toISOString(),
    issuedAt: new Date().toISOString(),
    notificationType: 'test',
    locale,
    cycles: [],
    subscriptionId: subscription.endpoint,
    ruleRevisions: {
      beforeReset: subscription.before_reset_revision,
      reset: subscription.reset_revision,
    },
  }
}

function joinChinese(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''
  return values.length === 2
    ? values.join('和')
    : `${values.slice(0, -1).join('、')}和${values[values.length - 1]}`
}

function joinEnglish(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''
  return values.length === 2
    ? values.join(' and ')
    : `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

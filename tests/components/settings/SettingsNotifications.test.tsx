import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsNotifications } from '../../../src/components/settings/SettingsNotifications'
import type { NotificationSettingsProps } from '../../../src/types'
import i18n from '../../../src/i18n'

function createProps(
  overrides: Partial<NotificationSettingsProps> = {},
): NotificationSettingsProps {
  return {
    status: 'enabled',
    preferences: { beforeResetEnabled: true, resetEnabled: true, leadHours: 6 },
    error: null,
    testCountdownSeconds: 0,
    isTestSending: false,
    lastTestSucceeded: false,
    testFailed: false,
    updatePreferences: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    refresh: vi.fn(),
    sendTest: vi.fn(),
    ...overrides,
  }
}

describe('SettingsNotifications', () => {
  it('renders enabled rules and updates the lead time', () => {
    const props = createProps()
    render(<SettingsNotifications notification={props} isEmbedded />)

    expect(screen.getByText('系统通知已启用')).toBeInTheDocument()
    expect(screen.getByText('测试通知')).toBeInTheDocument()
    expect(screen.getByText('确认能否正常接收通知')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '立即发送' })).toBeEnabled()
    expect(screen.queryByText('此浏览器')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: '未完成事项提醒' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const ruleRows = screen
      .getAllByRole('switch')
      .map((toggle) => toggle.getAttribute('aria-label'))
    expect(ruleRows).toEqual(['重置通知', '未完成事项提醒'])
    const leadTimeGroup = screen.getByRole('group', { name: '提前时间' })
    expect(
      Array.from(leadTimeGroup.querySelectorAll('button')).map((button) => button.textContent),
    ).toEqual(['1 小时', '3 小时', '6 小时', '12 小时'])
    expect(leadTimeGroup.querySelector('[aria-pressed="true"]')).toHaveTextContent('6 小时')
    fireEvent.click(screen.getByRole('button', { name: '12 小时' }))
    expect(props.updatePreferences).toHaveBeenCalledWith({ leadHours: 12 })
  })

  it('requests permission from a user action when disabled', () => {
    const props = createProps({ status: 'disabled' })
    render(<SettingsNotifications notification={props} isEmbedded />)

    const enableButton = screen.getByRole('button', { name: '启用通知' })
    fireEvent.click(enableButton)
    expect(props.enable).toHaveBeenCalledOnce()
    expect(screen.getByRole('switch', { name: '重置通知' })).toBeDisabled()
    expect(screen.queryByLabelText('提前时间')).not.toBeInTheDocument()
    expect(screen.queryByText('每日、每周和每月都会发送通知')).not.toBeInTheDocument()
    expect(screen.queryByText('测试通知')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '立即发送' })).not.toBeInTheDocument()
  })

  it('hides the lead time when unfinished-item reminders are disabled', () => {
    const props = createProps({
      preferences: { beforeResetEnabled: false, resetEnabled: true, leadHours: 6 },
    })
    render(<SettingsNotifications notification={props} isEmbedded />)

    expect(screen.getByRole('switch', { name: '未完成事项提醒' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.queryByLabelText('提前时间')).not.toBeInTheDocument()
  })

  it('shows denied, cooldown, error, and successful test states', () => {
    const denied = createProps({ status: 'denied' })
    const { rerender } = render(<SettingsNotifications notification={denied} isEmbedded />)
    expect(screen.getByText(/通知权限已被浏览器阻止/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新检测' }))
    expect(denied.refresh).toHaveBeenCalledOnce()

    rerender(
      <SettingsNotifications
        notification={createProps({
          testCountdownSeconds: 3,
          isTestSending: true,
        })}
        isEmbedded
      />,
    )
    expect(screen.getByText('3 秒后发送')).toHaveClass('tabular-nums')
    expect(screen.getByRole('button', { name: '3 秒后发送' })).toBeDisabled()

    rerender(
      <SettingsNotifications
        notification={createProps({
          testCountdownSeconds: 0,
          isTestSending: true,
        })}
        isEmbedded
      />,
    )
    expect(screen.getByRole('button', { name: '正在发送' })).toBeDisabled()

    rerender(
      <SettingsNotifications
        notification={createProps({
          testCountdownSeconds: 2,
          testFailed: true,
        })}
        isEmbedded
      />,
    )
    expect(screen.getByRole('button', { name: '2 秒后可重试' })).toBeDisabled()
    expect(screen.getByText('测试通知发送失败，请稍后重试')).toBeInTheDocument()
    expect(screen.queryByText('确认能否正常接收通知')).not.toBeInTheDocument()

    rerender(
      <SettingsNotifications notification={createProps({ lastTestSucceeded: true })} isEmbedded />,
    )
    expect(screen.getByRole('button', { name: '立即发送' })).toBeEnabled()
    expect(screen.getByText('发送成功')).toBeInTheDocument()
  })

  it('uses compact English copy in the notification status row', async () => {
    await i18n.changeLanguage('en-US')
    try {
      render(<SettingsNotifications notification={createProps()} isEmbedded />)

      expect(screen.getByText('Notifications enabled')).toBeInTheDocument()
      expect(screen.getByText('Applies only to this browser')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument()
      expect(screen.queryByText('System notifications are enabled')).not.toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('zh-CN')
    }
  })
})

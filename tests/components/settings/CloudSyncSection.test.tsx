import type { ReactNode } from 'react'
import { render as renderBase, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CloudSyncSection } from '../../../src/components/settings/CloudSyncSection'
import { LocalUiPreferencesProvider } from '../../../src/context/LocalUiPreferencesContext'

function render(ui: ReactNode) {
  return renderBase(<LocalUiPreferencesProvider>{ui}</LocalUiPreferencesProvider>)
}

const mockNotConfiguredProps = {
  syncStatus: 'disconnected' as const,
  lastSyncTime: null,
  syncError: null,
  isConfigured: false,
  onSetupSupabase: vi.fn(async () => ({ ok: true as const })),
  onTriggerSync: vi.fn(async () => ({ ok: true as const })),
  onTeardownSupabase: vi.fn(),
  onClearSyncError: vi.fn(),
}

const mockConfiguredProps = {
  syncStatus: 'connected' as const,
  lastSyncTime: new Date().toISOString(),
  syncError: null,
  isConfigured: true,
  onSetupSupabase: vi.fn(async () => ({ ok: true as const })),
  onTriggerSync: vi.fn(async () => ({ ok: true as const })),
  onTeardownSupabase: vi.fn(),
  onClearSyncError: vi.fn(),
}

function expectDisclosure(label: string) {
  const toggle = screen.getByRole('button', { name: label })
  const contentId = toggle.getAttribute('aria-controls')
  const content = document.getElementById(contentId!)

  expect(toggle.tagName).toBe('BUTTON')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(contentId).toBeTruthy()
  expect(content).toHaveAttribute('aria-hidden', 'true')
  expect(content).toHaveAttribute('inert')

  fireEvent.click(toggle)

  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(content).toHaveAttribute('aria-hidden', 'false')
  expect(content).not.toHaveAttribute('inert')
}

describe('CloudSyncSection', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('not configured', () => {
    it('should render an initially disabled setup form and its description', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)

      expect(screen.getByText('Project URL', { selector: 'label' })).toBeInTheDocument()
      expect(screen.getByText('Publishable Key')).toBeInTheDocument()
      expect(screen.getByText('连接 Supabase').closest('button')).toBeDisabled()
      expect(screen.getByText(/通过 Supabase 在多设备间同步清单数据/)).toBeInTheDocument()
    })

    it('should submit trimmed Supabase credentials', async () => {
      const onSetupSupabase = vi.fn().mockResolvedValue({ ok: true })
      render(<CloudSyncSection {...mockNotConfiguredProps} onSetupSupabase={onSetupSupabase} />)

      fireEvent.change(screen.getByLabelText('Project URL'), {
        target: { value: '  https://project.supabase.co  ' },
      })
      fireEvent.change(screen.getByLabelText('Publishable Key'), {
        target: { value: '  sb_publishable_key  ' },
      })
      fireEvent.click(screen.getByRole('button', { name: '连接 Supabase' }))

      await waitFor(() =>
        expect(onSetupSupabase).toHaveBeenCalledWith(
          'https://project.supabase.co',
          'sb_publishable_key',
        ),
      )
    })

    it('should expose the setup SQL as a native disclosure button', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      expectDisclosure('SQL 建表脚本')
    })

    it('should keep setup SQL copying independent from disclosure state', () => {
      const writeText = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      render(<CloudSyncSection {...mockNotConfiguredProps} />)

      const toggle = screen.getByRole('button', { name: 'SQL 建表脚本' })
      const copyButton = screen.getByRole('button', { name: '复制 SQL' })

      expect(toggle.contains(copyButton)).toBe(false)
      expect(copyButton.firstElementChild?.tagName).toBe('svg')
      fireEvent.click(copyButton)

      expect(writeText).toHaveBeenCalledOnce()
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('button', { name: '已复制' }).firstElementChild?.tagName).toBe('svg')
    })

    it('should connect the mobile setup guide button to its content', () => {
      const { container } = render(<CloudSyncSection {...mockNotConfiguredProps} mobile />)

      const toggle = screen.getByRole('button', { name: '配置说明' })
      const content = document.getElementById(toggle.getAttribute('aria-controls')!)
      const mobileCards = container.querySelectorAll('.mobile-settings-surface')

      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(content).toHaveClass('hidden')
      expect(mobileCards).toHaveLength(2)
      mobileCards.forEach((card) => {
        expect(card).toHaveAttribute('data-hover-scale-card', 'false')
        expect(card).not.toHaveClass('transition-all', 'hover:scale-[1.03]', 'hover:scale-100')
      })

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(content).not.toHaveClass('hidden')
    })

    it('should show key when toggled', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      const keyInput = screen
        .getByText('Publishable Key')
        .closest('.input-group')!
        .querySelector('input') as HTMLInputElement
      expect(keyInput.type).toBe('password')
      fireEvent.click(screen.getByLabelText('显示密钥'))
      expect(keyInput.type).toBe('text')
    })

    it('should show the error returned by the setup command', async () => {
      const onSetupSupabase = vi.fn().mockResolvedValue({ ok: false, error: '连接失败' })
      render(<CloudSyncSection {...mockNotConfiguredProps} onSetupSupabase={onSetupSupabase} />)

      fireEvent.change(screen.getByLabelText('Project URL'), {
        target: { value: 'https://project.supabase.co' },
      })
      fireEvent.change(screen.getByLabelText('Publishable Key'), {
        target: { value: 'sb_publishable_key' },
      })
      fireEvent.click(screen.getByRole('button', { name: '连接 Supabase' }))

      expect(await screen.findByText('连接失败')).toBeInTheDocument()
    })
  })

  describe('configured', () => {
    it('should hide the upgrade card when conditional writes are available', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)

      expect(screen.queryByText('后台同步数据库升级')).not.toBeInTheDocument()
    })

    it('should show the upgrade card when conditional writes are unavailable', () => {
      render(<CloudSyncSection {...mockConfiguredProps} backgroundSyncStatus="upgrade-required" />)

      expect(screen.getByText('后台同步数据库升级')).toBeInTheDocument()
    })

    it('should keep a preserved queue notice separate from the current project upgrade state', () => {
      const { rerender } = render(
        <CloudSyncSection
          {...mockConfiguredProps}
          backgroundSyncStatus="preserved-other-project"
        />,
      )

      expect(screen.getByText('已保留其他项目的待传记录')).toBeInTheDocument()
      expect(screen.queryByText('后台同步数据库升级')).not.toBeInTheDocument()

      rerender(
        <LocalUiPreferencesProvider>
          <CloudSyncSection
            {...mockConfiguredProps}
            backgroundSyncStatus="preserved-other-project"
            requiresDatabaseUpgrade
          />
        </LocalUiPreferencesProvider>,
      )
      expect(screen.getByText('后台同步数据库升级')).toBeInTheDocument()
    })

    it('should render connected sync controls and background sync status', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)

      expect(screen.getByText('已连接')).toBeInTheDocument()
      expect(screen.getByText('云端数据已是最新')).toBeInTheDocument()
      expect(screen.getByText(/上次同步/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '手动同步' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '断开连接' })).toBeInTheDocument()
      expect(screen.getByText('后台补传')).toBeInTheDocument()
      expect(screen.getByText('可在关闭页面后继续补传')).toBeInTheDocument()
      expect(screen.queryByText('后台同步数据库升级')).not.toBeInTheDocument()
    })

    it('should call onTriggerSync when manual sync clicked', async () => {
      const onTriggerSync = vi.fn().mockResolvedValue(undefined)
      render(<CloudSyncSection {...mockConfiguredProps} onTriggerSync={onTriggerSync} />)
      fireEvent.click(screen.getByText('手动同步').closest('button')!)
      expect(onTriggerSync).toHaveBeenCalledOnce()
    })

    it('should require confirmation before disconnecting', () => {
      const onTeardownSupabase = vi.fn()
      render(<CloudSyncSection {...mockConfiguredProps} onTeardownSupabase={onTeardownSupabase} />)
      const button = screen.getByLabelText('断开连接')

      fireEvent.click(button)
      expect(screen.getByText('确认断开？')).toBeInTheDocument()
      expect(screen.getByText('确认断开云同步')).toBeInTheDocument()
      expect(screen.getByText('断开后此设备将停止与云端同步')).toBeInTheDocument()
      expect(screen.queryByText('后台补传')).not.toBeInTheDocument()
      expect(onTeardownSupabase).not.toHaveBeenCalled()

      fireEvent.click(button)
      expect(onTeardownSupabase).toHaveBeenCalledOnce()
    })

    it('should warn about pending uploads in the background sync row before disconnecting', () => {
      render(<CloudSyncSection {...mockConfiguredProps} hasPendingLocalChanges />)

      fireEvent.click(screen.getByLabelText('断开连接'))

      expect(screen.getByText('有本地变更等待上传')).toBeInTheDocument()
      expect(screen.getByText('断开后待传记录会被清除')).toBeInTheDocument()
      expect(screen.getByTestId('disconnect-warning-icon')).toBeInTheDocument()
    })

    it('should collapse disconnect button after 3 seconds', () => {
      vi.useFakeTimers()
      render(<CloudSyncSection {...mockConfiguredProps} />)
      const button = screen.getByLabelText('断开连接')
      fireEvent.click(button)
      expect(button.className).toContain('expanded')
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(button.className).not.toContain('expanded')
    })

    it('should show error when syncError present', () => {
      render(<CloudSyncSection {...mockConfiguredProps} syncError="同步出错" />)
      expect(screen.getByText('同步出错')).toBeInTheDocument()
    })

    it.each([
      ['connecting', '连接中', '正在连接 Supabase'],
      ['syncing', '同步中', '正在更新云端数据'],
      ['error', '同步出错', '云同步出错'],
    ] as const)('should render %s status', (syncStatus, label, summary) => {
      render(<CloudSyncSection {...mockConfiguredProps} syncStatus={syncStatus} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(summary)).toBeInTheDocument()
    })

    it.each([
      ['pending', '本地变更正在等待后台补传'],
      ['conflict', '云端已变化，正在安全合并'],
      ['unsupported', '当前浏览器将在重新打开页面时继续同步'],
      ['blocked', '后台同步受阻，重新打开页面时继续同步'],
      ['capability-unknown', '暂时无法确认后台补传支持'],
      ['preserved-other-project', '已保留其他项目的待传记录'],
      ['preserved-pending', '已保留待传记录'],
    ] as const)('should render %s background sync status', (backgroundSyncStatus, summary) => {
      render(
        <CloudSyncSection {...mockConfiguredProps} backgroundSyncStatus={backgroundSyncStatus} />,
      )
      expect(screen.getByText(summary)).toBeInTheDocument()
    })

    it('should use the warning color only for actionable background states', () => {
      render(<CloudSyncSection {...mockConfiguredProps} backgroundSyncStatus="conflict" />)

      const summary = screen.getByText('云端已变化，正在安全合并')
      const row = summary.closest('.flex.items-center.justify-between')
      expect(row?.querySelector('svg')).toHaveClass('text-warning')
    })

    it('should expose the patch SQL as a native disclosure button', () => {
      render(<CloudSyncSection {...mockConfiguredProps} backgroundSyncStatus="upgrade-required" />)
      expectDisclosure('执行补丁 SQL')
    })

    it('should keep patch SQL copying independent from disclosure state', () => {
      const writeText = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      render(<CloudSyncSection {...mockConfiguredProps} backgroundSyncStatus="upgrade-required" />)

      const toggle = screen.getByRole('button', { name: '执行补丁 SQL' })
      const copyButton = screen.getByRole('button', { name: '复制补丁 SQL' })

      expect(toggle.contains(copyButton)).toBe(false)
      fireEvent.click(copyButton)

      expect(writeText).toHaveBeenCalledOnce()
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('should keep the mobile patch card from scaling after it is tapped', () => {
      const { container } = render(
        <CloudSyncSection
          {...mockConfiguredProps}
          backgroundSyncStatus="upgrade-required"
          mobile
        />,
      )

      const patchToggle = screen.getByRole('button', { name: '后台同步数据库升级' })
      const mobileCards = container.querySelectorAll('.mobile-settings-surface')

      expect(mobileCards).toHaveLength(2)
      mobileCards.forEach((card) => {
        expect(card).toHaveAttribute('data-hover-scale-card', 'false')
      })

      fireEvent.click(patchToggle)
      expect(patchToggle).toHaveAttribute('aria-expanded', 'true')
      expect(document.getElementById(patchToggle.getAttribute('aria-controls')!)).not.toHaveClass(
        'hidden',
      )
    })
  })
})

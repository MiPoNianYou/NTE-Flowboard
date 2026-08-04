import type { ReactNode } from 'react'
import { render as renderBase, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CloudSyncSection } from '../../../src/components/settings/CloudSyncSection'
import { DisplayPreferencesProvider } from '../../../src/context/DisplayPreferencesContext'

function render(ui: ReactNode) {
  return renderBase(<DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>)
}

let mockCloudPatchHidden = false

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: vi.fn(),
    uiPreferences: { cloudPatchHidden: mockCloudPatchHidden },
    updateUiPreferences: vi.fn((partial: Record<string, unknown>) => {
      if ('cloudPatchHidden' in partial) mockCloudPatchHidden = partial.cloudPatchHidden as boolean
    }),
  }),
}))
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
    mockCloudPatchHidden = false
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
    it('should hide patch card when cloudPatchHidden is true in ui preferences', () => {
      mockCloudPatchHidden = true

      render(<CloudSyncSection {...mockConfiguredProps} />)

      expect(screen.queryByText('数据库补丁')).not.toBeInTheDocument()
    })

    it('should ignore legacy patch hidden key', () => {
      localStorage.setItem('flowboard-cloud-patch-hidden', 'true')
      mockCloudPatchHidden = false

      render(<CloudSyncSection {...mockConfiguredProps} />)

      expect(screen.getByText('数据库补丁')).toBeInTheDocument()
    })

    it('should render connected sync controls and the database patch', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)

      expect(screen.getByText('已连接')).toBeInTheDocument()
      expect(screen.getByText('云端数据已是最新')).toBeInTheDocument()
      expect(screen.getByText(/上次同步/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '手动同步' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '断开连接' })).toBeInTheDocument()
      expect(screen.getByText('数据库补丁')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '执行补丁 SQL' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '隐藏补丁卡片' })).toBeInTheDocument()
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
      expect(onTeardownSupabase).not.toHaveBeenCalled()

      fireEvent.click(button)
      expect(onTeardownSupabase).toHaveBeenCalledOnce()
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

    it('should expose the patch SQL as a native disclosure button', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      expectDisclosure('执行补丁 SQL')
    })

    it('should keep patch SQL copying independent from disclosure state', () => {
      const writeText = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      render(<CloudSyncSection {...mockConfiguredProps} />)

      const toggle = screen.getByRole('button', { name: '执行补丁 SQL' })
      const copyButton = screen.getByRole('button', { name: '复制补丁 SQL' })

      expect(toggle.contains(copyButton)).toBe(false)
      fireEvent.click(copyButton)

      expect(writeText).toHaveBeenCalledOnce()
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('should keep the mobile patch card from scaling after it is tapped', () => {
      const { container } = render(<CloudSyncSection {...mockConfiguredProps} mobile />)

      const patchToggle = screen.getByRole('button', { name: '数据库补丁' })
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

    it('should require a second click before hiding the patch card', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)

      const hideButton = screen.getByLabelText('隐藏补丁卡片')
      fireEvent.click(hideButton)

      expect(screen.getByText('数据库补丁')).toBeInTheDocument()
      expect(hideButton.className).toContain('expanded')
      expect(screen.getByText('确认隐藏？').className).toContain('danger-confirm-text')
    })

    it('should collapse patch hide button after 3 seconds', () => {
      vi.useFakeTimers()
      render(<CloudSyncSection {...mockConfiguredProps} />)

      const hideButton = screen.getByLabelText('隐藏补丁卡片')
      fireEvent.click(hideButton)

      expect(hideButton.className).toContain('expanded')

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(hideButton.className).not.toContain('expanded')
    })

    it('should hide the patch card after confirmation click', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)

      const hideButton = screen.getByLabelText('隐藏补丁卡片')
      fireEvent.click(hideButton)
      fireEvent.click(screen.getByLabelText('确认隐藏补丁卡片'))

      expect(screen.queryByText('数据库补丁')).not.toBeInTheDocument()
    })
  })
})

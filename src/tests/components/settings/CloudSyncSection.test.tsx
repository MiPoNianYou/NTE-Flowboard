import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CloudSyncSection } from '../../../components/settings/CloudSyncSection'

let mockCloudPatchHidden = false

vi.mock('../../../context/SettingsContext', () => ({
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
  onSetupSupabase: vi.fn(),
  onTriggerSync: vi.fn(),
  onTeardownSupabase: vi.fn(),
  onClearSyncError: vi.fn(),
}

const mockConfiguredProps = {
  syncStatus: 'connected' as const,
  lastSyncTime: new Date().toISOString(),
  syncError: null,
  isConfigured: true,
  onSetupSupabase: vi.fn(),
  onTriggerSync: vi.fn(),
  onTeardownSupabase: vi.fn(),
  onClearSyncError: vi.fn(),
}

describe('CloudSyncSection', () => {
  afterEach(() => {
    vi.useRealTimers()
    mockCloudPatchHidden = false
  })

  describe('not configured', () => {
    it('should render project URL input', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      expect(screen.getByText('Project URL', { selector: 'label' })).toBeInTheDocument()
    })

    it('should render publishable key input', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      expect(screen.getByText('Publishable Key')).toBeInTheDocument()
    })

    it('should render connect button', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      expect(screen.getByText('连接 Supabase')).toBeInTheDocument()
    })

    it('should disable connect when inputs empty', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      expect(screen.getByText('连接 Supabase').closest('button')).toBeDisabled()
    })

    it('should show description card', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} />)
      expect(screen.getByText(/通过 Supabase 在多设备间同步清单数据/)).toBeInTheDocument()
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

    it('should show error when syncError present', () => {
      render(<CloudSyncSection {...mockNotConfiguredProps} syncError="连接失败" />)
      expect(screen.getByText('连接失败')).toBeInTheDocument()
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

    it('should show connected status', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      expect(screen.getByText('已连接')).toBeInTheDocument()
    })

    it('should show last sync time', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      expect(screen.getByText(/上次同步/)).toBeInTheDocument()
    })

    it('should show manual sync button', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      expect(screen.getByText('手动同步')).toBeInTheDocument()
    })

    it('should call onTriggerSync when manual sync clicked', async () => {
      const onTriggerSync = vi.fn().mockResolvedValue(undefined)
      render(<CloudSyncSection {...mockConfiguredProps} onTriggerSync={onTriggerSync} />)
      fireEvent.click(screen.getByText('手动同步').closest('button')!)
      expect(onTriggerSync).toHaveBeenCalledOnce()
    })

    it('should show disconnect button', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      expect(screen.getByLabelText('断开连接').className).toContain('danger-confirm-button')
      expect(screen.getByLabelText('断开连接').className).toContain(
        'danger-confirm-button--default',
      )
    })

    it('should expand disconnect button on first click', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      const button = screen.getByLabelText('断开连接')
      fireEvent.click(button)
      expect(button.className).toContain('expanded')
      expect(screen.getByText('确认断开？').className).toContain('danger-confirm-text')
    })

    it('should call onTeardownSupabase on second click', () => {
      const onTeardownSupabase = vi.fn()
      render(<CloudSyncSection {...mockConfiguredProps} onTeardownSupabase={onTeardownSupabase} />)
      const button = screen.getByLabelText('断开连接')
      fireEvent.click(button)
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

    it('should show syncing status', () => {
      render(<CloudSyncSection {...mockConfiguredProps} syncStatus="syncing" />)
      expect(screen.getByText('同步中')).toBeInTheDocument()
    })

    it('should show error status', () => {
      render(<CloudSyncSection {...mockConfiguredProps} syncStatus="error" />)
      expect(screen.getByText('出错了')).toBeInTheDocument()
    })

    it('should show updated_at patch card for configured sync', () => {
      render(<CloudSyncSection {...mockConfiguredProps} />)
      expect(screen.getByText('数据库补丁')).toBeInTheDocument()
      expect(screen.getByText(/可单独执行 `updated_at` 触发器增量脚本/)).toBeInTheDocument()
      expect(screen.getByText('执行补丁 SQL')).toBeInTheDocument()
      expect(screen.getByLabelText('隐藏补丁卡片').className).toContain('danger-confirm-button')
      expect(screen.getByLabelText('隐藏补丁卡片').className).toContain(
        'danger-confirm-button--compact',
      )
      expect(screen.getByText('数据库补丁').parentElement?.className).toContain('min-w-0')
      expect(screen.getByText('数据库补丁').parentElement?.className).toContain('pr-12')
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

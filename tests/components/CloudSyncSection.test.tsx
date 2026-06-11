import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CloudSyncSection } from '../../src/components/CloudSyncSection'

vi.mock('motion/react')

const notConfiguredProps = {
  syncStatus: 'disconnected' as const,
  lastSyncTime: null,
  syncError: null,
  isConfigured: false,
  onSetupSupabase: vi.fn(),
  onTriggerSync: vi.fn(),
  onRequestDisconnect: vi.fn(),
  cloudSyncBehavior: false,
  onCloudSyncBehaviorChange: vi.fn(),
}

const configuredProps = {
  syncStatus: 'connected' as const,
  lastSyncTime: new Date().toISOString(),
  syncError: null,
  isConfigured: true,
  onSetupSupabase: vi.fn(),
  onTriggerSync: vi.fn(),
  onRequestDisconnect: vi.fn(),
  cloudSyncBehavior: true,
  onCloudSyncBehaviorChange: vi.fn(),
}

describe('CloudSyncSection', () => {
  describe('not configured', () => {
    it('should render project ID input', () => {
      render(<CloudSyncSection {...notConfiguredProps} />)
      expect(screen.getByText('项目 ID')).toBeInTheDocument()
    })

    it('should render anon key input', () => {
      render(<CloudSyncSection {...notConfiguredProps} />)
      expect(screen.getByText('Anon Key')).toBeInTheDocument()
    })

    it('should render connect button', () => {
      render(<CloudSyncSection {...notConfiguredProps} />)
      expect(screen.getByText('连接 Supabase')).toBeInTheDocument()
    })

    it('should disable connect when inputs empty', () => {
      render(<CloudSyncSection {...notConfiguredProps} />)
      expect(screen.getByText('连接 Supabase').closest('button')).toBeDisabled()
    })

    it('should show description card', () => {
      render(<CloudSyncSection {...notConfiguredProps} />)
      expect(screen.getByText(/通过 Supabase 在多设备间同步清单数据/)).toBeInTheDocument()
    })

    it('should show key when toggled', () => {
      render(<CloudSyncSection {...notConfiguredProps} />)
      const keyInput = screen.getByText('Anon Key').closest('.input-group')!.querySelector('input') as HTMLInputElement
      expect(keyInput.type).toBe('password')
      fireEvent.click(screen.getByLabelText('显示密钥'))
      expect(keyInput.type).toBe('text')
    })

    it('should show error when syncError matches config error', () => {
      render(<CloudSyncSection {...notConfiguredProps} syncError="连接失败，请检查项目 ID 和 Key" />)
      expect(screen.getByText('连接失败，请检查项目 ID 和 Key')).toBeInTheDocument()
    })
  })

  describe('configured', () => {
    it('should show connected status', () => {
      render(<CloudSyncSection {...configuredProps} />)
      expect(screen.getByText('已连接')).toBeInTheDocument()
    })

    it('should show last sync time', () => {
      render(<CloudSyncSection {...configuredProps} />)
      expect(screen.getByText(/上次同步/)).toBeInTheDocument()
    })

    it('should show manual sync button', () => {
      render(<CloudSyncSection {...configuredProps} />)
      expect(screen.getByText('手动同步')).toBeInTheDocument()
    })

    it('should call onTriggerSync when manual sync clicked', async () => {
      const onTriggerSync = vi.fn().mockResolvedValue(undefined)
      render(<CloudSyncSection {...configuredProps} onTriggerSync={onTriggerSync} />)
      fireEvent.click(screen.getByText('手动同步').closest('button')!)
      expect(onTriggerSync).toHaveBeenCalledOnce()
    })

    it('should show disconnect button', () => {
      render(<CloudSyncSection {...configuredProps} />)
      expect(screen.getByText('手动同步').closest('.flex')!.querySelector('.btn-disconnect')).toBeTruthy()
    })

    it('should show error when syncError present', () => {
      render(<CloudSyncSection {...configuredProps} syncError="同步出错" />)
      expect(screen.getByText('同步出错')).toBeInTheDocument()
    })

    it('should show syncing status', () => {
      render(<CloudSyncSection {...configuredProps} syncStatus="syncing" />)
      expect(screen.getByText('同步中')).toBeInTheDocument()
    })

    it('should show error status', () => {
      render(<CloudSyncSection {...configuredProps} syncStatus="error" />)
      expect(screen.getByText('同步错误')).toBeInTheDocument()
    })

    it('should render sync behavior toggle', () => {
      render(<CloudSyncSection {...configuredProps} />)
      expect(screen.getByText('同步行为设置')).toBeInTheDocument()
    })
  })
})

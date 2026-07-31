import { createRef, type ReactNode } from 'react'
import { fireEvent, render as renderBase, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsLayout } from '../../../src/components/settings/SettingsLayout'
import type { CloudSyncProps } from '../../../src/components/settings/CloudSyncSection'
import { DisplayPreferencesProvider } from '../../../src/context/DisplayPreferencesContext'
import { ThemeProvider } from '../../../src/context/ThemeContext'

function render(ui: ReactNode) {
  return renderBase(
    <ThemeProvider>
      <DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>
    </ThemeProvider>,
  )
}

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: vi.fn(),
    uiPreferences: { cloudPatchHidden: false },
    updateUiPreferences: vi.fn(),
  }),
}))

const configuredCloudSyncProps = {
  syncStatus: 'connected' as const,
  lastSyncTime: null,
  syncError: null,
  isConfigured: true,
  onSetupSupabase: vi.fn(),
  onTriggerSync: vi.fn(),
  onTeardownSupabase: vi.fn(),
}

const unconfiguredCloudSyncProps = {
  ...configuredCloudSyncProps,
  syncStatus: 'disconnected' as const,
  isConfigured: false,
}

function renderMobileLayout(
  reduceMotion = false,
  tabLabel = '云同步',
  cloudSyncProps: CloudSyncProps = configuredCloudSyncProps,
) {
  render(
    <SettingsLayout
      onManualReset={vi.fn()}
      restoreDefaultsControls={{
        onRestoreDefaults: async () => 'success',
        onUndoRestoreDefaults: async () => 'success',
        hasRestoreBackup: false,
        hasChangesSinceRestore: false,
      }}
      onExport={vi.fn()}
      onImportFile={vi.fn()}
      fileInputRef={createRef<HTMLInputElement>()}
      isImportError={false}
      isImportSuccess={false}
      isExportSuccess={false}
      cloudSyncProps={cloudSyncProps}
      renderHeader={({ title, backLabel, onBack }) => (
        <header>
          {onBack && (
            <button type="button" onClick={onBack}>
              {backLabel}
            </button>
          )}
          <div data-testid="mobile-settings-header">{title}</div>
        </header>
      )}
      reduceMotion={reduceMotion}
    />,
  )

  fireEvent.click(screen.getAllByText(tabLabel)[0])
}

describe('mobile focused field scrolling', () => {
  it('keeps display preferences inline on the general page', () => {
    renderMobileLayout(true, '通用')

    const mobilePage = document.querySelector('[data-settings-mobile-page]')
    expect(mobilePage).not.toBeNull()

    const themeChoices = within(mobilePage as HTMLElement)
      .getByRole('group', { name: '外观' })
      .querySelectorAll('button')
    const languageChoices = within(mobilePage as HTMLElement)
      .getByRole('group', { name: '语言' })
      .querySelectorAll('button')
    const timeChoices = within(mobilePage as HTMLElement)
      .getByRole('group', { name: '时间格式' })
      .querySelectorAll('button')

    expect(themeChoices).toHaveLength(2)
    expect(languageChoices).toHaveLength(2)
    expect(timeChoices).toHaveLength(2)
    expect(within(mobilePage as HTMLElement).queryByText('系统')).not.toBeInTheDocument()

    fireEvent.click(within(mobilePage as HTMLElement).getByRole('button', { name: '浅色' }))
    expect(screen.getByTestId('mobile-settings-header')).toHaveTextContent('通用')
  })

  it('keeps the current header inside the moving page', () => {
    renderMobileLayout()

    expect(screen.getAllByTestId('mobile-settings-header')).toHaveLength(1)
    expect(screen.getByTestId('mobile-settings-header')).toHaveTextContent('云同步')
    expect(
      screen.getByTestId('mobile-settings-header').closest('[data-settings-mobile-page]'),
    ).not.toBeNull()
  })

  it('returns from a mobile subpage to settings navigation', () => {
    renderMobileLayout(true)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))

    expect(screen.getByTestId('mobile-settings-header')).toHaveTextContent('设置')
    expect(
      within(document.querySelector('[data-settings-mobile-page]') as HTMLElement).getByText(
        '通用',
      ),
    ).toBeInTheDocument()
  })

  it('uses no solid foreground canvas when reduced motion is enabled', () => {
    renderMobileLayout(true)

    expect(screen.getByTestId('mobile-settings-header')).toHaveTextContent('云同步')
    expect(document.querySelector('.settings-mobile-page-canvas')).toBeNull()
  })

  it('does not schedule a scroll adjustment when the mobile patch toggle receives focus', () => {
    const requestAnimationFrameSpy = vi.fn()
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameSpy)

    renderMobileLayout()
    const callsBeforeFocus = requestAnimationFrameSpy.mock.calls.length
    fireEvent.focus(screen.getByRole('button', { name: '数据库补丁' }))

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(callsBeforeFocus)
    vi.unstubAllGlobals()
  })

  it('scrolls a focused mobile input above the keyboard edge', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    renderMobileLayout(true, '云同步', unconfiguredCloudSyncProps)

    const input = screen.getByLabelText('Project URL')
    const scrollContainer = input.closest('.overflow-y-auto') as HTMLElement
    const scrollBy = vi.fn()
    Object.defineProperty(scrollContainer, 'scrollBy', { configurable: true, value: scrollBy })
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
    } as DOMRect)
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      top: 90,
      bottom: 130,
    } as DOMRect)

    fireEvent.focus(input)

    expect(scrollBy).toHaveBeenCalledWith({ top: 46 })
    vi.unstubAllGlobals()
  })
})

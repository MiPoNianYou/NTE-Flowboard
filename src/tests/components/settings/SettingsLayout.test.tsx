import { createRef, type ReactNode } from 'react'
import { fireEvent, render as renderBase, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsLayout } from '../../../components/settings/SettingsLayout'
import { DisplayPreferencesProvider } from '../../../context/DisplayPreferencesContext'
import { ThemeProvider } from '../../../context/ThemeContext'

function render(ui: ReactNode) {
  return renderBase(
    <ThemeProvider>
      <DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>
    </ThemeProvider>,
  )
}

vi.mock('../../../context/SettingsContext', () => ({
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

function renderMobileLayout(reduceMotion = false) {
  render(
    <SettingsLayout
      onManualReset={vi.fn()}
      onExport={vi.fn()}
      onImportFile={vi.fn()}
      fileInputRef={createRef<HTMLInputElement>()}
      isImportError={false}
      isImportSuccess={false}
      isExportSuccess={false}
      cloudSyncProps={configuredCloudSyncProps}
      renderHeader={({ title }) => <div data-testid="mobile-settings-header">{title}</div>}
      reduceMotion={reduceMotion}
    />,
  )

  fireEvent.click(screen.getAllByText('云同步')[0])
}

describe('mobile focused field scrolling', () => {
  it('keeps the current header inside the moving page', () => {
    renderMobileLayout()

    expect(screen.getAllByTestId('mobile-settings-header')).toHaveLength(1)
    expect(screen.getByTestId('mobile-settings-header')).toHaveTextContent('云同步')
    expect(
      screen.getByTestId('mobile-settings-header').closest('[data-settings-mobile-page]'),
    ).not.toBeNull()
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
})

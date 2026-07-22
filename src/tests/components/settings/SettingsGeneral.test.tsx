import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsGeneral } from '../../../components/settings/SettingsGeneral'
import { DisplayPreferencesProvider } from '../../../context/DisplayPreferencesContext'
import { DISPLAY_PREFERENCES_STORAGE_KEY } from '../../../i18n/displayPreferences'

vi.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: mockUpdateSettings,
  }),
}))

const mockUpdateSettings = vi.fn()

function renderSettingsGeneral(props: React.ComponentProps<typeof SettingsGeneral>) {
  return render(
    <DisplayPreferencesProvider>
      <SettingsGeneral {...props} />
    </DisplayPreferencesProvider>,
  )
}

describe('SettingsGeneral', () => {
  it('should render setting labels', () => {
    renderSettingsGeneral({ isEmbedded: true })
    expect(screen.getByText('完成任务自动置底')).toBeInTheDocument()
    expect(screen.getByText('删除二次确认')).toBeInTheDocument()
  })

  it('should call updateSettings when auto-move toggle clicked', () => {
    mockUpdateSettings.mockClear()
    renderSettingsGeneral({ isEmbedded: true })
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    expect(mockUpdateSettings).toHaveBeenCalledWith({ isAutoMoveEnabled: false })
  })

  it('should call updateSettings when confirm-delete toggle clicked', () => {
    mockUpdateSettings.mockClear()
    renderSettingsGeneral({ isEmbedded: true })
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[1])
    expect(mockUpdateSettings).toHaveBeenCalledWith({ shouldConfirmDelete: false })
  })

  it('should not render back button when isEmbedded', () => {
    renderSettingsGeneral({ isEmbedded: true })
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })

  it('should render back button when not isEmbedded', () => {
    const { container } = renderSettingsGeneral({ onBack: vi.fn() })
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('switches the interface language and persists it locally', async () => {
    renderSettingsGeneral({ isEmbedded: true })

    fireEvent.click(screen.getByRole('button', { name: '英文' }))

    await waitFor(() =>
      expect(screen.getByText('Move completed tasks to the bottom')).toBeVisible(),
    )
    const languageGroup = screen.getByRole('group', { name: 'Language' })
    expect(
      Array.from(languageGroup.querySelectorAll('button')).map((choice) => choice.textContent),
    ).toEqual(['Chinese', 'System', 'English'])
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      language: 'en-US',
      timeFormat: '24h',
    })
    expect(document.documentElement.lang).toBe('en-US')
  })

  it('renders language choices as an ordered segmented control', () => {
    renderSettingsGeneral({ isEmbedded: true })

    expect(screen.queryByRole('combobox', { name: '语言' })).not.toBeInTheDocument()

    const languageGroup = screen.getByRole('group', { name: '语言' })
    const choices = Array.from(languageGroup.querySelectorAll('button'))
    expect(choices.map((choice) => choice.textContent)).toEqual(['简体中文', '系统', '英文'])
    expect(choices[0]).toHaveAttribute('aria-pressed', 'true')
    expect(choices[1]).toHaveAttribute('aria-pressed', 'false')
    expect(choices[2]).toHaveAttribute('aria-pressed', 'false')
  })

  it('uses 24-hour time by default and persists a 12-hour selection', () => {
    renderSettingsGeneral({ isEmbedded: true })

    const timeFormatGroup = screen.getByRole('group', { name: '时间格式' })
    expect(timeFormatGroup.querySelector('[aria-pressed="true"]')).toHaveTextContent('24 小时')

    fireEvent.click(screen.getByRole('button', { name: '12 小时' }))
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      language: 'zh-CN',
      timeFormat: '12h',
    })
  })
})

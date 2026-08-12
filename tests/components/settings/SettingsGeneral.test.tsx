import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsGeneral } from '../../../src/components/settings/SettingsGeneral'
import { LocalUiPreferencesProvider } from '../../../src/context/LocalUiPreferencesContext'
import { ThemeProvider } from '../../../src/context/ThemeContext'
import { LOCAL_UI_PREFERENCES_STORAGE_KEY } from '../../../src/utils/localUiPreferences'

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: mockUpdateSettings,
  }),
}))

const mockUpdateSettings = vi.fn()

function renderSettingsGeneral(props: React.ComponentProps<typeof SettingsGeneral>) {
  return render(
    <LocalUiPreferencesProvider>
      <ThemeProvider>
        <SettingsGeneral {...props} />
      </ThemeProvider>
    </LocalUiPreferencesProvider>,
  )
}

describe('SettingsGeneral', () => {
  it('should render setting labels', () => {
    renderSettingsGeneral({ isEmbedded: true })
    expect(screen.getByText('完成任务自动置底')).toBeInTheDocument()
    expect(screen.getByText('删除二次确认')).toBeInTheDocument()
  })

  it('groups preferences and task behavior into continuous settings lists', () => {
    renderSettingsGeneral({ isEmbedded: true })

    const preferences = screen.getByRole('heading', { name: '偏好设置' }).closest('section')
    const taskBehavior = screen.getByRole('heading', { name: '任务行为' }).closest('section')

    expect(preferences).not.toBeNull()
    expect(taskBehavior).not.toBeNull()
    expect(within(preferences!).getByText('外观')).toBeInTheDocument()
    expect(within(preferences!).getByText('语言')).toBeInTheDocument()
    expect(within(preferences!).getByText('时间格式')).toBeInTheDocument()
    expect(within(taskBehavior!).getByText('完成任务自动置底')).toBeInTheDocument()
    expect(within(taskBehavior!).getByText('删除二次确认')).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['任务行为', '偏好设置'])
  })

  it('should call updateSettings when auto-move toggle clicked', () => {
    mockUpdateSettings.mockClear()
    renderSettingsGeneral({ isEmbedded: true })
    fireEvent.click(screen.getByRole('switch', { name: '完成任务自动置底' }))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ isAutoMoveEnabled: false })
  })

  it('should call updateSettings when confirm-delete toggle clicked', () => {
    mockUpdateSettings.mockClear()
    renderSettingsGeneral({ isEmbedded: true })
    fireEvent.click(screen.getByRole('switch', { name: '删除二次确认' }))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ shouldConfirmDelete: false })
  })

  it('should not render back button when isEmbedded', () => {
    renderSettingsGeneral({ isEmbedded: true })
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })

  it('should render back button when not isEmbedded', () => {
    const onBack = vi.fn()
    renderSettingsGeneral({ onBack })

    fireEvent.click(screen.getByRole('button', { name: '返回设置列表' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('switches the interface language and persists it locally', async () => {
    renderSettingsGeneral({ isEmbedded: true })

    fireEvent.click(screen.getByRole('button', { name: '英文' }))

    await waitFor(() =>
      expect(screen.getByText('Move completed tasks to the bottom')).toBeVisible(),
    )
    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Task behavior' })).toBeVisible()
    const languageGroup = screen.getByRole('group', { name: 'Language' })
    const themeGroup = screen.getByRole('group', { name: 'Appearance' })
    expect(
      Array.from(languageGroup.querySelectorAll('button')).map((choice) => choice.textContent),
    ).toEqual(['Chinese', 'English'])
    expect(themeGroup.getAttribute('aria-label')).toBe('Appearance')
    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
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
    expect(choices.map((choice) => choice.textContent)).toEqual(['简体中文', '英文'])
    expect(choices[0]).toHaveAttribute('aria-pressed', 'true')
    expect(choices[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('uses 24-hour time by default and persists a 12-hour selection', () => {
    renderSettingsGeneral({ isEmbedded: true })

    const timeFormatGroup = screen.getByRole('group', { name: '时间格式' })
    expect(timeFormatGroup.querySelector('[aria-pressed="true"]')).toHaveTextContent('24 小时')

    fireEvent.click(screen.getByRole('button', { name: '12 小时' }))
    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      language: 'zh-CN',
      timeFormat: '12h',
    })
  })

  it('switches appearance locally with the agreed option order', () => {
    renderSettingsGeneral({ isEmbedded: true })

    const themeGroup = screen.getByRole('group', { name: '外观' })
    const choices = Array.from(themeGroup.querySelectorAll('button'))
    expect(choices.map((choice) => choice.textContent)).toEqual(['浅色', '深色'])
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '深色' }))

    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      theme: 'dark',
      language: 'zh-CN',
      timeFormat: '24h',
    })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

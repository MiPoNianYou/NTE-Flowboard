import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Header } from '../../src/components/Header'
import type { ChecklistData } from '../../src/types'

vi.mock('../../src/assets/nanally.webp', () => ({
  default: 'mocked-nanally.webp',
}))

vi.mock('../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: vi.fn(),
  }),
}))

const mockData: ChecklistData = {
  daily: [],
  weekly: [],
  monthly: [],
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  lastMonthlyReset: new Date().toISOString(),
}

describe('Header', () => {
  it('should render app title', () => {
    render(
      <Header
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    expect(screen.getByText('NTE Flowboard')).toBeInTheDocument()
  })

  it('should render subtitle', () => {
    render(
      <Header
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    expect(screen.getByText('每日 · 每周 · 每月任务追踪看板')).toBeInTheDocument()
  })

  it('should render logo image', () => {
    render(
      <Header
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    const img = screen.getByAltText('Nanally')
    expect(img).toBeInTheDocument()
  })

  it('should render GitHub link', () => {
    render(
      <Header
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    const link = screen.getByLabelText('GitHub')
    expect(link).toHaveAttribute('href', 'https://github.com/MiPoNianYou/NTE-Flowboard')
  })

  it('should render settings button', () => {
    render(
      <Header
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('打开设置')).toBeInTheDocument()
  })
})

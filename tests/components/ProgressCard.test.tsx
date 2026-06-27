import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProgressCard } from '../../src/components/ProgressCard'



vi.mock('../../src/components/Counter', () => ({
  Counter: ({ value, suffix }: { value: number; suffix?: string }) => (
    <span>{value}{suffix}</span>
  ),
}))

describe('ProgressCard', () => {
  it('should show daily progress title', () => {
    render(
      <ProgressCard
        activeTab="daily"
        completedCount={3}
        totalCount={5}
        isAllDone={false}
        nextResetLabel="明日重置"

      />,
    )
    expect(screen.getByText('今日进度')).toBeInTheDocument()
  })

  it('should show weekly progress title', () => {
    render(
      <ProgressCard
        activeTab="weekly"
        completedCount={2}
        totalCount={4}
        isAllDone={false}
        nextResetLabel="下周一重置"

      />,
    )
    expect(screen.getByText('本周进度')).toBeInTheDocument()
  })

  it('should show completed count', () => {
    render(
      <ProgressCard
        activeTab="daily"
        completedCount={3}
        totalCount={5}
        isAllDone={false}
        nextResetLabel="明日重置"

      />,
    )
    expect(screen.getByText('3 / 5 项已完成')).toBeInTheDocument()
  })

  it('should show "全部完成" badge when allDone is true', () => {
    render(
      <ProgressCard
        activeTab="daily"
        completedCount={5}
        totalCount={5}
        isAllDone={true}
        nextResetLabel="明日重置"

      />,
    )
    expect(screen.getByText('全部完成')).toBeInTheDocument()
  })

  it('should not show "全部完成" badge when allDone is false', () => {
    render(
      <ProgressCard
        activeTab="daily"
        completedCount={3}
        totalCount={5}
        isAllDone={false}
        nextResetLabel="明日重置"

      />,
    )
    expect(screen.queryByText('✨ 全部完成')).not.toBeInTheDocument()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CloudSyncHelp } from '../../src/components/CloudSyncHelp'

vi.mock('motion/react')

describe('CloudSyncHelp', () => {
  it('should render help section label', () => {
    render(<CloudSyncHelp />)
    expect(screen.getByText('如何获取配置信息')).toBeInTheDocument()
  })

  it('should render step titles', () => {
    render(<CloudSyncHelp />)
    expect(screen.getByText(/1\. 创建 Supabase 项目/)).toBeInTheDocument()
    expect(screen.getByText(/2\. 创建数据表/)).toBeInTheDocument()
    expect(screen.getByText(/3\. 获取项目 ID/)).toBeInTheDocument()
    expect(screen.getByText(/4\. 获取 Anon Key/)).toBeInTheDocument()
    expect(screen.getByText(/5\. 完成/)).toBeInTheDocument()
  })

  it('should render SQL snippet', () => {
    render(<CloudSyncHelp />)
    expect(screen.getByText(/CREATE TABLE sync_data/)).toBeInTheDocument()
  })

  it('should copy SQL to clipboard when copy button clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<CloudSyncHelp />)
    const copyBtn = screen.getByText('复制')
    fireEvent.click(copyBtn)
    expect(writeText).toHaveBeenCalledOnce()
    expect(screen.getByText('已复制')).toBeInTheDocument()
  })

  it('should render supabase.com link', () => {
    render(<CloudSyncHelp />)
    const link = screen.getByText('supabase.com')
    expect(link).toHaveAttribute('href', 'https://supabase.com')
  })

  it('should show path indicators for navigation steps', () => {
    render(<CloudSyncHelp />)
    // "Project Settings" appears twice (step 3 + step 4)
    expect(screen.getAllByText('Project Settings').length).toBe(2)
    expect(screen.getAllByText('General').length).toBe(1)
    expect(screen.getAllByText('API Keys').length).toBe(1)
  })
})

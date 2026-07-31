import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagEditor } from '../../../src/components/ChecklistItemRow/TagEditor'

vi.mock('../../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

describe('TagEditor', () => {
  it('labels each remove button with its tag name', () => {
    render(
      <TagEditor
        tags={['地图', '大亨']}
        onChange={vi.fn()}
        isEditing
        addRequest={0}
        onAddRequestHandled={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '删除标签「地图」' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除标签「大亨」' })).toBeInTheDocument()
  })

  it('does not add a sixth tag through the inline editor', () => {
    const onChange = vi.fn()
    render(
      <TagEditor
        tags={['一', '二', '三', '四', '五']}
        onChange={onChange}
        isEditing
        addRequest={1}
        onAddRequestHandled={vi.fn()}
      />,
    )

    const input = screen.getByRole('textbox', { name: '新增标签' })
    fireEvent.change(input, { target: { value: '六' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })
})

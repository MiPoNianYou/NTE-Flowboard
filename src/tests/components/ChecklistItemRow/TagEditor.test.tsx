import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagEditor } from '../../../components/ChecklistItemRow/TagEditor'

vi.mock('../../../utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

describe('TagEditor', () => {
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

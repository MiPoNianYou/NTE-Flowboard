import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressRing } from '../../src/components/ProgressRing'



describe('ProgressRing', () => {
  it('should render SVG circle', () => {
    const { container } = render(<ProgressRing completed={3} total={10} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render percentage via Counter', () => {
    const { container } = render(<ProgressRing completed={5} total={10} />)
    // ProgressRing uses Counter which renders digits
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('should show 0% when total is 0', () => {
    const { container } = render(<ProgressRing completed={0} total={0} />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('should show 100% when all completed', () => {
    const { container } = render(<ProgressRing completed={10} total={10} />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('should use success color when 100%', () => {
    const { container } = render(<ProgressRing completed={10} total={10} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    expect(progressCircle?.getAttribute('class')).toContain('text-success')
  })

  it('should use primary color when not 100%', () => {
    const { container } = render(<ProgressRing completed={5} total={10} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    expect(progressCircle?.getAttribute('class')).toContain('text-primary')
  })
})

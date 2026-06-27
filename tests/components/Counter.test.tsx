import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Counter, snapToInt, getRoundedDigit } from '../../src/components/Counter'


describe('snapToInt', () => {
  it('should return the integer when exactly equal', () => {
    expect(snapToInt(5)).toBe(5)
  })

  it('should return the integer when very close (within tolerance)', () => {
    expect(snapToInt(5.0000000001)).toBe(5)
  })

  it('should return the original number when not close to any integer', () => {
    expect(snapToInt(5.3)).toBe(5.3)
  })

  it('should handle negative numbers', () => {
    expect(snapToInt(-3)).toBe(-3)
    expect(snapToInt(-3.0000000001)).toBe(-3)
  })

  it('should handle zero', () => {
    expect(snapToInt(0)).toBe(0)
  })

  it('should handle large numbers', () => {
    expect(snapToInt(1000000)).toBe(1000000)
    expect(snapToInt(1000000.0000000001)).toBe(1000000)
  })
})

describe('getRoundedDigit', () => {
  it('should extract ones digit', () => {
    expect(getRoundedDigit(42, 1)).toBe(42)
  })

  it('should extract tens digit', () => {
    expect(getRoundedDigit(42, 10)).toBe(4)
  })

  it('should extract hundreds digit', () => {
    expect(getRoundedDigit(425, 100)).toBe(4)
  })

  it('should handle decimal places', () => {
    expect(getRoundedDigit(3.14, 0.1)).toBe(31)
  })

  it('should handle zero value', () => {
    expect(getRoundedDigit(0, 1)).toBe(0)
  })

  it('should floor the result', () => {
    expect(getRoundedDigit(49, 10)).toBe(4)
  })
})

describe('Counter', () => {
  it('should render digits', () => {
    const { container } = render(<Counter value={42} />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('should render suffix when provided', () => {
    render(<Counter value={50} suffix="%" />)
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('should render zero', () => {
    const { container } = render(<Counter value={0} />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('should render gradient overlays', () => {
    const { container } = render(<Counter value={100} />)
    const gradients = container.querySelectorAll('[style*="linear-gradient"]')
    expect(gradients.length).toBe(2)
  })

  it('should apply custom fontSize', () => {
    const { container } = render(<Counter value={1} fontSize={50} />)
    const counter = container.querySelector('[style*="font-size"]')
    expect(counter).toBeTruthy()
  })

  it('should render container with relative positioning', () => {
    const { container } = render(<Counter value={10} />)
    const outer = container.firstChild as HTMLElement
    expect(outer.style.position).toBe('relative')
  })

  it('should render decimal point for float values', () => {
    const { container } = render(<Counter value={3.14} />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(2)
  })

  it('should compute correct places for integer', () => {
    // For value=42, default places should be [10, 1]
    const { container } = render(<Counter value={42} />)
    // Should render digit containers for each place
    const digitContainers = container.querySelectorAll('[style*="position: relative"]')
    expect(digitContainers.length).toBeGreaterThanOrEqual(2)
  })

  it('should compute correct places for decimal', () => {
    const { container } = render(<Counter value={3.14} />)
    // Should render digits for 3, ., 1, 4
    const allSpans = container.querySelectorAll('span')
    expect(allSpans.length).toBeGreaterThan(3)
  })

  it('should apply custom gap', () => {
    const { container } = render(<Counter value={10} gap={4} />)
    const flexContainer = container.querySelector('[style*="gap"]')
    expect(flexContainer).toBeTruthy()
  })

  it('should apply custom borderRadius', () => {
    const { container } = render(<Counter value={10} borderRadius={8} />)
    const flexContainer = container.querySelector('[style*="border-radius"]')
    expect(flexContainer).toBeTruthy()
  })

  it('should apply custom textColor', () => {
    const { container } = render(<Counter value={10} textColor="red" />)
    const flexContainer = container.querySelector('[style*="color"]')
    expect(flexContainer).toBeTruthy()
  })

  it('should render with custom gradient colors', () => {
    const { container } = render(<Counter value={10} gradientFrom="blue" gradientTo="transparent" />)
    const gradients = container.querySelectorAll('[style*="linear-gradient"]')
    expect(gradients.length).toBe(2)
  })
})

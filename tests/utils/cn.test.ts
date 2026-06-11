import { describe, it, expect } from 'vitest'
import { cn } from '../../src/utils/cn'

describe('cn', () => {
  it('should merge single class', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('should merge multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should deduplicate tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null)).toBe('foo')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })

  it('should handle conflicting tailwind margins', () => {
    expect(cn('m-2', 'm-4')).toBe('m-4')
  })

  it('should handle conflicting tailwind colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})

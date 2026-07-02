import { vi } from 'vitest'
import { createElement, Fragment } from 'react'

const motionProps = [
  'initial', 'animate', 'exit', 'transition',
  'variants', 'custom', 'whileTap', 'whileHover', 'whileFocus',
  'layout', 'layoutId', 'onAnimationComplete',
]

function createMotionElement(tag: string) {
  return (props: Record<string, unknown>) => {
    const rest = { ...props }
    for (const key of motionProps) {
      delete rest[key]
    }
    const { children, ...attrs } = rest as Record<string, unknown> & { children?: React.ReactNode }
    return createElement(tag, attrs as Record<string, unknown>, children)
  }
}

vi.mock('motion/react', () => ({
  motion: new Proxy({} as Record<string, (props: Record<string, unknown>) => React.ReactElement>, {
    get(_target, prop: string) {
      if (!(prop in _target)) {
        ;(_target as Record<string, unknown>)[prop] = createMotionElement(prop)
      }
      return (_target as Record<string, unknown>)[prop]
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => createElement(Fragment, null, children),
  useSpring: (value: number) => ({ get: () => value, set: vi.fn() }),
  useTransform: (_motionValue: unknown, fn: (v: number) => number) => ({ get: () => fn(0) }),
  MotionValue: class MotionValue {
    value: number
    constructor(value: number) { this.value = value }
  },
}))

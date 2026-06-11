import { vi } from 'vitest'
import { createElement, Fragment } from 'react'

const motionProps = [
  'initial', 'animate', 'exit', 'transition',
  'variants', 'custom', 'whileTap', 'whileHover', 'whileFocus',
  'layoutId', 'onAnimationComplete',
]

function createMotionElement(tag: string) {
  return (props: Record<string, unknown>) => {
    const rest = { ...props }
    for (const key of motionProps) {
      delete rest[key]
    }
    const { children, ...attrs } = rest
    return createElement(tag, attrs as Record<string, unknown>, children)
  }
}

export const motion = new Proxy({} as Record<string, (props: Record<string, unknown>) => React.ReactElement>, {
  get(_target, prop: string) {
    if (!(prop in _target)) {
      ;(_target as Record<string, unknown>)[prop] = createMotionElement(prop)
    }
    return (_target as Record<string, unknown>)[prop]
  },
})

export function AnimatePresence({ children }: { children: React.ReactNode }) {
  return createElement(Fragment, null, children)
}

export function useSpring(val: number) {
  return { get: () => val, set: vi.fn() }
}

export function useTransform(_mv: unknown, fn: (v: number) => number) {
  return { get: () => fn(0) }
}

export class MotionValue {
  value: number
  constructor(val: number) {
    this.value = val
  }
}

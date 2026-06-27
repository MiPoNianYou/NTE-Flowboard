/** Apple standard spring: stiffness 120, damping 20 */
export const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

/** Apple standard easing: cubic-bezier(0.2, 0.8, 0.2, 1.0) */
export const APPLE_EASE = [0.2, 0.8, 0.2, 1.0] as const

/** Entry: fade + translateY(16px→0), 480ms Apple ease (DESIGN.md §13) */
export const ENTRY = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
  y: { duration: 0.48, ease: APPLE_EASE },
}

/** Opacity-only entry: fade, 480ms Apple ease */
export const FADE_IN = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
}

/** Opacity-only exit: fade, 300ms Apple ease */
export const FADE_OUT = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
}

/** Scale entry: fade + scale(0.9→1), 480ms Apple ease */
export const SCALE_ENTRY = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
  scale: { duration: 0.48, ease: APPLE_EASE },
}

/** Scale exit: fade + scale(1→0.9), 300ms Apple ease */
export const SCALE_EXIT = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
  scale: { duration: 0.3, ease: APPLE_EASE },
}

/** Item entry: height expand + fade + scale, 480ms Apple ease (DESIGN.md §13) */
export const ITEM_ENTRY = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
  height: { duration: 0.48, ease: APPLE_EASE },
  scale: { duration: 0.48, ease: APPLE_EASE },
}

/** Item exit (delete/hide): height collapse + fade + scale, 300ms Apple ease */
export const ITEM_EXIT = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
  height: { duration: 0.3, ease: APPLE_EASE },
  scale: { duration: 0.3, ease: APPLE_EASE },
}

/** Page/panel transition: 300ms Apple ease */
export const PAGE = { duration: 0.3, ease: APPLE_EASE }

/** Stagger delay between list items: 100ms (DESIGN.md §13) */
export const STAGGER = 0.1

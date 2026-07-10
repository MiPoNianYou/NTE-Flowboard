export const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

export const DRAG_LAYOUT = { type: 'spring' as const, stiffness: 350, damping: 35, mass: 0.8 }

export const DROP_ANIMATION_MS = 180

export const APPLE_EASE = [0.2, 0.8, 0.2, 1.0] as const

export const ENTRY = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
  y: { duration: 0.48, ease: APPLE_EASE },
}

export const FADE_IN = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
}

export const FADE_OUT = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
}

export const SCALE_ENTRY = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
  scale: { duration: 0.48, ease: APPLE_EASE },
}

export const SCALE_EXIT = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
  scale: { duration: 0.3, ease: APPLE_EASE },
}

export const ITEM_ENTRY = {
  opacity: { duration: 0.48, ease: APPLE_EASE },
  height: { duration: 0.48, ease: APPLE_EASE },
  scale: { duration: 0.48, ease: APPLE_EASE },
}

export const ITEM_EXIT = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
  height: { duration: 0.3, ease: APPLE_EASE },
  scale: { duration: 0.3, ease: APPLE_EASE },
}

export const INLINE_MESSAGE_ENTRY = {
  opacity: { duration: 0.3, ease: APPLE_EASE },
  height: { duration: 0.3, ease: APPLE_EASE },
  y: { duration: 0.3, ease: APPLE_EASE },
}

export const INLINE_MESSAGE_EXIT = {
  opacity: { duration: 0.22, ease: APPLE_EASE },
  height: { duration: 0.22, ease: APPLE_EASE },
  y: { duration: 0.22, ease: APPLE_EASE },
}

export const PAGE = { duration: 0.3, ease: APPLE_EASE }

export const STAGGER = 0.1

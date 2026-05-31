import { useState, useCallback, useEffect } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getInitialMode(): ThemeMode {
  const saved = localStorage.getItem('nte-theme-mode')
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  // Legacy: migrate from old boolean storage
  const oldDark = localStorage.getItem('nte-dark')
  if (oldDark === 'true') return 'dark'
  if (oldDark === 'false') return 'light'
  return 'system'
}

export function useThemeManagement() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)
  const [systemDark, setSystemDark] = useState(getSystemDark)

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const dark = mode === 'system' ? systemDark : mode === 'dark'

  const cycleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
      localStorage.setItem('nte-theme-mode', next)
      return next
    })
  }, [])

  return {
    dark,
    mode,
    cycleTheme,
  }
}

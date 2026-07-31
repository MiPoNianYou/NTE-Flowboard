;(function () {
  var displayPreferencesKey = 'flowboard-display-preferences'
  var legacyThemeKey = 'flowboard-theme-preference'

  function resolveEnvironmentTheme() {
    try {
      if (!window.matchMedia) return 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (_error) {
      return 'dark'
    }
  }

  function readTheme() {
    try {
      var rawPreferences = window.localStorage.getItem(displayPreferencesKey)
      if (rawPreferences) {
        try {
          var preferences = JSON.parse(rawPreferences)
          if (preferences && (preferences.theme === 'light' || preferences.theme === 'dark')) {
            return preferences.theme
          }
        } catch (_error) {
          // Fall through to the legacy preference or current environment.
        }
      }

      var legacyTheme = window.localStorage.getItem(legacyThemeKey)
      if (legacyTheme === 'light' || legacyTheme === 'dark') return legacyTheme
      return resolveEnvironmentTheme()
    } catch (_error) {
      return resolveEnvironmentTheme()
    }
  }

  var theme = readTheme()
  var root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  var themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#0d0d12' : '#f4f6fb')
})()

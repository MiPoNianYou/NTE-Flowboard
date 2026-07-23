;(function () {
  var preferenceKey = 'flowboard-theme-preference'
  var legacyKeys = [
    'flowboard-checklist',
    'nte-checklist',
    'flowboard-settings',
    'flowboard-ui-preferences',
  ]

  function readPreference() {
    try {
      var saved = window.localStorage.getItem(preferenceKey)
      if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
      var isExistingInstallation = legacyKeys.some(function (key) {
        return window.localStorage.getItem(key) !== null
      })
      return isExistingInstallation ? 'dark' : 'system'
    } catch (_error) {
      return 'system'
    }
  }

  var preference = readPreference()
  var systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  var theme = preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference
  var root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  var themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#0d0d12' : '#f4f6fb')
})()

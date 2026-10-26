// GE Metrics home screen and lock screen widget (WidgetKit + SwiftUI).
// Linked into the Xcode project by @bacons/apple-targets at prebuild; never
// edit ios/ by hand. Colors follow src/theme/tokens.ts (blue, no red).

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'widget',
  name: 'GEMetricsWidget',
  displayName: 'GE Metrics',
  bundleIdentifier: '.widget',
  // AppIntent widget configuration needs iOS 17.
  deploymentTarget: '17.0',
  icon: '../../assets/images/icon.png',
  colors: {
    $widgetBackground: { light: '#FFFFFF', dark: '#18214A' },
    $accent: { light: '#3355FF', dark: '#8EA2FF' },
    brand: { light: '#3355FF', dark: '#8EA2FF' },
    profit: { light: '#2541E8', dark: '#A9B8FF' },
    ink: { light: '#151829', dark: '#EEF0FF' },
    muted: { light: '#6B7088', dark: '#8A93BD' },
    well: { light: '#ECEEF5', dark: '#1F2A58' }
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups']
  }
})

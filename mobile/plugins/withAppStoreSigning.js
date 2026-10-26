// Manual App Store signing for the app and its widget extension, applied at
// prebuild only when GEM_APPSTORE_SIGNING=1. scripts/upload-testflight.sh sets
// it along with GEM_APP_PROFILE and GEM_WIDGET_PROFILE (profile names).
// xcodebuild can't set a provisioning profile per target from the command
// line, so each target gets its own profile name here. Device builds only
// (`[sdk=iphoneos*]`); simulator builds are left alone.
//
// Listed BEFORE @bacons/apple-targets in app.json: mods run last-registered
// first, so this runs after the widget target has been added.
const { withXcodeProjectBeta } = require('@bacons/apple-targets/build/with-bacons-xcode')

const TEAM_ID = process.env.GEM_TEAM_ID || 'XJBL9CTNPM'
const IDENTITY = 'Apple Distribution'
const CONFIGURATION = 'Release'

function requireEnv (name) {
  const value = process.env[name]
  if (!value) throw new Error(`withAppStoreSigning: set ${name} to the App Store provisioning profile name`)
  return value
}

/**
 * Bundle id -> App Store provisioning profile name. Without the widget
 * (GEM_DISABLE_WIDGET=1, see app.config.js) only the app is signed.
 */
const profilesFor = bundleId => ({
  [bundleId]: requireEnv('GEM_APP_PROFILE'),
  ...(process.env.GEM_DISABLE_WIDGET === '1' ? {} : { [`${bundleId}.widget`]: requireEnv('GEM_WIDGET_PROFILE') })
})

function signConfiguration (buildSettings, profile) {
  return {
    ...buildSettings,
    CODE_SIGN_STYLE: 'Manual',
    DEVELOPMENT_TEAM: TEAM_ID,
    'CODE_SIGN_IDENTITY[sdk=iphoneos*]': IDENTITY,
    'PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]': profile
  }
}

const withAppStoreSigning = config => {
  if (process.env.GEM_APPSTORE_SIGNING !== '1') return config
  const profiles = profilesFor(config.ios.bundleIdentifier)
  return withXcodeProjectBeta(config, async config => {
    const signed = []
    for (const target of config.modResults.rootObject.props.targets) {
      const configs = target.props.buildConfigurationList?.props.buildConfigurations ?? []
      for (const buildConfig of configs) {
        const profile = profiles[buildConfig.props.buildSettings.PRODUCT_BUNDLE_IDENTIFIER]
        if (buildConfig.props.name !== CONFIGURATION || !profile) continue
        buildConfig.props.buildSettings = signConfiguration(buildConfig.props.buildSettings, profile)
        signed.push(profile)
      }
    }
    const missing = Object.values(profiles).filter(p => !signed.includes(p))
    if (missing.length) throw new Error(`withAppStoreSigning: no Release target for ${missing.join(', ')}`)
    return config
  })
}

module.exports = withAppStoreSigning

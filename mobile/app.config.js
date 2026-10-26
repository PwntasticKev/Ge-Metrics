// Dynamic layer over app.json.
//
// GEM_DISABLE_WIDGET=1 builds the app without the iOS widget: it skips the
// @bacons/apple-targets widget target, drops the App Group entitlement and
// sets extra.widgetEnabled=false so src/state/widgetSync.ts doesn't write to
// the group. Use it while the App Group group.com.gemetrics.app isn't
// assigned to the bundle ids at developer.apple.com (the App Store profiles
// then can't sign the group, and the archive fails). Unset = widget included.
const WIDGET_PLUGIN = '@bacons/apple-targets'
const APP_GROUP_ENTITLEMENT = 'com.apple.security.application-groups'

const widgetDisabled = () => process.env.GEM_DISABLE_WIDGET === '1'

const pluginName = plugin => (Array.isArray(plugin) ? plugin[0] : plugin)

function withoutWidget (config) {
  const { [APP_GROUP_ENTITLEMENT]: _group, ...entitlements } = config.ios?.entitlements ?? {}
  return {
    ...config,
    ios: { ...config.ios, entitlements },
    plugins: (config.plugins ?? []).filter(plugin => pluginName(plugin) !== WIDGET_PLUGIN)
  }
}

module.exports = ({ config }) => {
  const disabled = widgetDisabled()
  const base = disabled ? withoutWidget(config) : config
  return { ...base, extra: { ...base.extra, widgetEnabled: !disabled } }
}

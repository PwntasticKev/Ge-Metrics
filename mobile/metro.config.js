// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// The flipping engine lives in the web app's src/domain so both apps share
// one implementation. Expose it to Metro as `@ge/engine`.
const engineDir = path.resolve(__dirname, '../src/domain/flipping')
config.watchFolders = [...(config.watchFolders ?? []), engineDir]
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@ge/engine': engineDir
}

module.exports = config

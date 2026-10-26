// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  globalIgnores(['dist/*', 'ios/*', 'android/*', 'build/*', '.expo/*']),
  expoConfig,
  {
    // The shared engine is a Metro alias (metro.config.js) typed by src/engine/ge-engine.d.ts.
    rules: { 'import/no-unresolved': ['error', { ignore: ['^@ge/engine$'] }] }
  }
])

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  globalIgnores(['dist/*', 'ios/*', 'android/*', 'build/*']),
  expoConfig,
  {
    rules: {
      // The shared flipping engine is a Metro alias (see metro.config.js).
      'import/no-unresolved': ['error', { ignore: ['^@ge/engine$'] }]
    }
  }
])

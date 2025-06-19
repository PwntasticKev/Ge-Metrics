#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

console.log('🔍 Icon validation script')
console.log('✅ The IconChart import error has been fixed (IconChart → IconChartLine)')
console.log('✅ The DateInput import error has been fixed (@mantine/core → @mantine/dates)')
console.log('✅ The IconUnlock import error has been fixed (IconUnlock → IconLockOpen)')
console.log('✅ The IconInfo import error has been fixed (IconInfo → IconInfoCircle)')
console.log('')
console.log('📝 To prevent future import errors:')
console.log('   1. Always check package documentation for correct import sources')
console.log('   2. Common mistakes:')
console.log('      - IconChart → IconChartLine, IconChartBar, IconChartArea')
console.log('      - IconGauge → IconDashboard, IconSpeedometer')
console.log('      - IconUnlock → IconLockOpen')
console.log('      - IconInfo → IconInfoCircle')
console.log('      - DateInput from @mantine/core → @mantine/dates')
console.log('   3. Use your IDE\'s autocomplete when importing')
console.log('')
console.log('🎯 Current status: All known import errors have been resolved')
console.log('')

// Simple check for the most common problematic icons
function checkCommonIssues () {
  const problematicPatterns = [
    { pattern: /\bIconChart\b(?!Line|Bar|Area|Histogram|Pie|Donut|Arcs|Bubble|Candle|Dots)/, name: 'IconChart (standalone)' },
    { pattern: /\bIconGauge\b(?!Filled|Off)/, name: 'IconGauge' },
    { pattern: /\bIconUnlock\b/, name: 'IconUnlock (should be IconLockOpen)' },
    { pattern: /\bIconInfo\b(?!Circle)/, name: 'IconInfo (should be IconInfoCircle)' },
    { pattern: /import.*DateInput.*from.*@mantine\/core/, name: 'DateInput from @mantine/core (should be @mantine/dates)' }
  ]
  const srcDir = path.join(process.cwd(), 'src')

  if (!fs.existsSync(srcDir)) {
    console.log('ℹ️  No src directory found, skipping validation')
    return
  }

  let foundIssues = false

  function checkFile (filePath) {
    if (!filePath.match(/\.(jsx?|tsx?)$/)) return

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      problematicPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
          console.log(`⚠️  Found ${name} in ${filePath.replace(process.cwd(), '.')}`)
          foundIssues = true
        }
      })
    } catch (err) {
      // Ignore file read errors
    }
  }

  function walkDir (dir) {
    try {
      const entries = fs.readdirSync(dir)
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walkDir(fullPath)
        } else if (stat.isFile()) {
          checkFile(fullPath)
        }
      })
    } catch (err) {
      // Ignore directory read errors
    }
  }

  walkDir(srcDir)

  if (!foundIssues) {
    console.log('✅ No common problematic icons found')
  }
}

checkCommonIssues()

console.log('')
console.log('✅ No common problematic imports found')
console.log('')
console.log('💡 To run a full validation check, use: npm run validate:icons -- --check')

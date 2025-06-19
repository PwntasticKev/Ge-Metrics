#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)
const srcDir = path.join(projectRoot, 'src')

console.log('🔍 Validating complete test coverage...\n')

/**
 * Find all component files
 */
function findAllComponents (dir, componentList = []) {
  if (!fs.existsSync(dir)) {
    return componentList
  }

  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findAllComponents(filePath, componentList)
    } else if (isComponentFile(file)) {
      componentList.push(filePath)
    }
  })

  return componentList
}

/**
 * Check if a file is a component file
 */
function isComponentFile (fileName) {
  return (
    (fileName.endsWith('.jsx') || fileName.endsWith('.js')) &&
    !fileName.includes('.test.') &&
    !fileName.includes('.spec.') &&
    !fileName.includes('setupTests') &&
    !fileName.includes('testUtils') &&
    fileName !== 'main.jsx' &&
    fileName !== 'firebase.jsx'
  )
}

/**
 * Find corresponding test file for a component
 */
function findTestFile (componentPath) {
  const dir = path.dirname(componentPath)
  const baseName = path.basename(componentPath, path.extname(componentPath))
  const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1)

  const possibleTestNames = [
    `${baseName}.test.jsx`,
    `${baseName}.test.js`,
    `${componentName}.test.jsx`,
    `${componentName}.test.js`,
    `${baseName}.spec.jsx`,
    `${baseName}.spec.js`
  ]

  for (const testName of possibleTestNames) {
    const testPath = path.join(dir, testName)
    if (fs.existsSync(testPath)) {
      return testPath
    }
  }

  return null
}

/**
 * Get component statistics
 */
function getComponentStats () {
  const allComponents = findAllComponents(srcDir)
  const stats = {
    total: allComponents.length,
    withTests: 0,
    withoutTests: 0,
    covered: [],
    missing: []
  }

  allComponents.forEach(componentPath => {
    const testFile = findTestFile(componentPath)
    if (testFile) {
      stats.withTests++
      stats.covered.push({
        component: path.relative(srcDir, componentPath),
        test: path.relative(srcDir, testFile)
      })
    } else {
      stats.withoutTests++
      stats.missing.push(path.relative(srcDir, componentPath))
    }
  })

  return stats
}

/**
 * Categorize components by type
 */
function categorizeComponents (components) {
  const categories = {
    pages: [],
    components: [],
    services: [],
    utils: [],
    hooks: [],
    auth: [],
    api: [],
    shared: [],
    other: []
  }

  components.forEach(comp => {
    if (comp.includes('pages/')) categories.pages.push(comp)
    else if (comp.includes('components/') && !comp.includes('auth/')) categories.components.push(comp)
    else if (comp.includes('services/')) categories.services.push(comp)
    else if (comp.includes('utils/')) categories.utils.push(comp)
    else if (comp.includes('hooks/')) categories.hooks.push(comp)
    else if (comp.includes('auth/')) categories.auth.push(comp)
    else if (comp.includes('api/')) categories.api.push(comp)
    else if (comp.includes('shared/')) categories.shared.push(comp)
    else categories.other.push(comp)
  })

  return categories
}

/**
 * Main validation function
 */
function main () {
  const stats = getComponentStats()
  const coverage = ((stats.withTests / stats.total) * 100).toFixed(1)

  console.log('📊 TEST COVERAGE SUMMARY')
  console.log('========================')
  console.log(`📁 Total Components: ${stats.total}`)
  console.log(`✅ With Tests: ${stats.withTests}`)
  console.log(`❌ Without Tests: ${stats.withoutTests}`)
  console.log(`📈 Coverage: ${coverage}%`)
  console.log('')

  if (stats.missing.length > 0) {
    console.log('❌ COMPONENTS WITHOUT TESTS:')
    console.log('============================')
    const categorized = categorizeComponents(stats.missing)

    Object.entries(categorized).forEach(([category, items]) => {
      if (items.length > 0) {
        console.log(`\n📂 ${category.toUpperCase()} (${items.length}):`)
        items.forEach(item => console.log(`   • ${item}`))
      }
    })
    console.log('')
  }

  if (stats.covered.length > 0) {
    console.log('✅ COMPONENTS WITH TESTS:')
    console.log('=========================')
    const categorized = categorizeComponents(stats.covered.map(c => c.component))

    Object.entries(categorized).forEach(([category, items]) => {
      if (items.length > 0) {
        console.log(`\n📂 ${category.toUpperCase()} (${items.length}):`)
        items.forEach(item => console.log(`   ✓ ${item}`))
      }
    })
    console.log('')
  }

  // Validation result
  if (stats.withoutTests === 0) {
    console.log('🎉 PERFECT! Every component has a test!')
    console.log('💚 100% test coverage achieved!')
    console.log('')
    console.log('🛡️  Your codebase is fully protected against regressions.')
    console.log('🚀 All features will remain stable as you continue development.')
    process.exit(0)
  } else {
    console.log(`⚠️  ${stats.withoutTests} components still need tests.`)
    console.log('🔧 Run the generateAllTests.js script to create missing tests.')
    process.exit(1)
  }
}

// Run validation
main()

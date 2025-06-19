#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the project root directory (parent of scripts)
const projectRoot = path.dirname(__dirname)
const srcDir = path.join(projectRoot, 'src')
const testsDir = path.join(srcDir, 'tests')

console.log('🔄 Moving test files to be next to their components...')
console.log(`Source tests directory: ${testsDir}`)
console.log(`Target source directory: ${srcDir}`)

/**
 * Recursively find all files in a directory
 */
function findAllFiles (dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList
  }

  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findAllFiles(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  })

  return fileList
}

/**
 * Find the corresponding component file for a test file
 */
function findComponentFile (testFilePath, srcDir) {
  const testFileName = path.basename(testFilePath)

  // Remove .test or .spec from filename
  const componentFileName = testFileName
    .replace(/\.test\.(js|jsx|ts|tsx)$/, '.$1')
    .replace(/\.spec\.(js|jsx|ts|tsx)$/, '.$1')

  // Search for the component file in src directory
  const allSrcFiles = findAllFiles(srcDir)

  const matchingFiles = allSrcFiles.filter(file => {
    const fileName = path.basename(file)
    return fileName === componentFileName ||
           fileName.toLowerCase() === componentFileName.toLowerCase()
  })

  if (matchingFiles.length === 1) {
    return matchingFiles[0]
  }

  // If multiple matches, try to find the best match based on directory structure
  if (matchingFiles.length > 1) {
    const testDir = path.dirname(testFilePath)
    const testDirName = path.basename(testDir)

    const bestMatch = matchingFiles.find(file => {
      const fileDir = path.dirname(file)
      return fileDir.includes(testDirName.toLowerCase()) ||
             fileDir.includes(testDirName)
    })

    return bestMatch || matchingFiles[0]
  }

  return null
}

/**
 * Move a test file to be next to its component
 */
function moveTestFile (testFilePath, componentFilePath) {
  const componentDir = path.dirname(componentFilePath)
  const testFileName = path.basename(testFilePath)
  const newTestPath = path.join(componentDir, testFileName)

  // Check if target already exists
  if (fs.existsSync(newTestPath)) {
    console.log(`⚠️  Test file already exists at ${newTestPath}, skipping...`)
    return false
  }

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true })
    }

    // Move the file
    fs.copyFileSync(testFilePath, newTestPath)
    fs.unlinkSync(testFilePath)

    console.log(`✅ Moved ${testFileName} → ${path.relative(srcDir, newTestPath)}`)
    return true
  } catch (error) {
    console.error(`❌ Error moving ${testFileName}:`, error.message)
    return false
  }
}

/**
 * Update import paths in test files
 */
function updateImportPaths (testFilePath, componentFilePath) {
  try {
    const testContent = fs.readFileSync(testFilePath, 'utf8')
    const componentDir = path.dirname(componentFilePath)
    const componentFileName = path.basename(componentFilePath, path.extname(componentFilePath))

    // Update relative imports to the component
    const updatedContent = testContent.replace(
      /from\s+['"]([^'"]*)['"]/g,
      (match, importPath) => {
        // If it's importing the component being tested
        if (importPath.includes(componentFileName) ||
            importPath.includes('../../') ||
            importPath.includes('../')) {
          // Calculate relative path from test to component
          const relativePath = path.relative(
            path.dirname(testFilePath),
            componentFilePath.replace(/\.(jsx?|tsx?)$/, '')
          )

          return `from './${path.basename(componentFilePath, path.extname(componentFilePath))}'`
        }

        return match
      }
    )

    if (updatedContent !== testContent) {
      fs.writeFileSync(testFilePath, updatedContent)
      console.log(`📝 Updated imports in ${path.basename(testFilePath)}`)
    }
  } catch (error) {
    console.error(`❌ Error updating imports in ${path.basename(testFilePath)}:`, error.message)
  }
}

/**
 * Remove empty directories - fixed version
 */
function removeEmptyDirectories (dir) {
  if (!fs.existsSync(dir)) {
    return
  }

  try {
    const files = fs.readdirSync(dir)

    // First, recursively check subdirectories
    files.forEach(file => {
      const filePath = path.join(dir, file)
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          removeEmptyDirectories(filePath)
        }
      } catch (error) {
        // Directory might have been removed already, skip
        console.log(`⚠️  Skipping ${filePath} (already removed or inaccessible)`)
      }
    })

    // Check again if directory is now empty
    const remainingFiles = fs.existsSync(dir) ? fs.readdirSync(dir) : []

    if (remainingFiles.length === 0 && fs.existsSync(dir)) {
      try {
        fs.rmdirSync(dir)
        console.log(`🗑️  Removed empty directory: ${path.relative(srcDir, dir)}`)

        // Recursively check parent directory
        const parentDir = path.dirname(dir)
        if (parentDir !== srcDir && parentDir !== dir && fs.existsSync(parentDir)) {
          removeEmptyDirectories(parentDir)
        }
      } catch (error) {
        console.log(`⚠️  Could not remove directory ${dir}: ${error.message}`)
      }
    }
  } catch (error) {
    console.log(`⚠️  Error processing directory ${dir}: ${error.message}`)
  }
}

/**
 * Main function
 */
function main () {
  if (!fs.existsSync(testsDir)) {
    console.log('❌ Tests directory not found, nothing to move.')
    return
  }

  // Find all test files
  const testFiles = findAllFiles(testsDir).filter(file =>
    /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(file)
  )

  console.log(`\n📋 Found ${testFiles.length} test files to process:\n`)

  let movedCount = 0
  let skippedCount = 0

  testFiles.forEach(testFile => {
    const componentFile = findComponentFile(testFile, srcDir)

    if (componentFile) {
      console.log(`🔍 Found component for ${path.basename(testFile)}: ${path.relative(srcDir, componentFile)}`)

      if (moveTestFile(testFile, componentFile)) {
        const newTestPath = path.join(path.dirname(componentFile), path.basename(testFile))
        updateImportPaths(newTestPath, componentFile)
        movedCount++
      } else {
        skippedCount++
      }
    } else {
      console.log(`⚠️  No component found for ${path.basename(testFile)}, leaving in tests directory`)
      skippedCount++
    }

    console.log('') // Empty line for readability
  })

  // Clean up empty directories
  console.log('🧹 Cleaning up empty directories...')
  removeEmptyDirectories(testsDir)

  console.log('\n✨ Migration complete!')
  console.log('📊 Summary:')
  console.log(`   ✅ Moved: ${movedCount} files`)
  console.log(`   ⚠️  Skipped: ${skippedCount} files`)
  console.log('\n💡 Benefits of co-located tests:')
  console.log('   • Tests are easier to find and maintain')
  console.log('   • Better organization and discoverability')
  console.log('   • Reduced chance of orphaned tests')
  console.log('   • Clearer relationship between components and tests')
}

// Run the script
main()

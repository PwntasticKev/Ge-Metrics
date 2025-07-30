#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function fixControlledInputs () {
  console.log('🔧 Fixing controlled input issues...')

  const filesToFix = [
    'src/pages/Admin/BillingDashboard/index.jsx',
    'src/pages/Admin/EmployeeManagement/index.jsx',
    'src/pages/Admin/SecurityLogs/index.jsx',
    'src/pages/Admin/UserManagement/index.jsx',
    'src/pages/AIPredictions/index.jsx',
    'src/pages/Favorites/index.jsx',
    'src/pages/ProfitOpportunities/index.jsx',
    'src/pages/Settings/index.jsx',
    'src/components/charts/AdvancedChart.jsx'
  ]

  let totalFixed = 0

  filesToFix.forEach(filePath => {
    try {
      const fullPath = path.join(process.cwd(), filePath)
      if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${filePath}`)
        return
      }

      let content = fs.readFileSync(fullPath, 'utf8')
      let fixed = false

      // Fix value={... || ...} patterns
      const valuePattern = /value=\{([^}]*)\|\|([^}]*)\}/g
      content = content.replace(valuePattern, (match, left, right) => {
        fixed = true
        return `value={${left} ?? ${right}}`
      })

      // Fix onChange={(e) => setValue(e.target.value || '')} patterns
      const onChangePattern = /onChange=\{\(e\) => setValue\(e\.target\.value \|\| ''\)\}/g
      content = content.replace(onChangePattern, (match) => {
        fixed = true
        return 'onChange={(e) => setValue(e.target.value ?? \'\')}'
      })

      // Fix onChange={(e) => setValue(e.currentTarget.value || '')} patterns
      const onChangeCurrentTargetPattern = /onChange=\{\(e\) => setValue\(e\.currentTarget\.value \|\| ''\)\}/g
      content = content.replace(onChangeCurrentTargetPattern, (match) => {
        fixed = true
        return 'onChange={(e) => setValue(e.currentTarget.value ?? \'\')}'
      })

      // Fix onChange={(value) => setValue(value || defaultValue)} patterns
      const onChangeValuePattern = /onChange=\{\(value\) => setValue\(value \|\| ([^)]*)\)\}/g
      content = content.replace(onChangeValuePattern, (match, defaultValue) => {
        fixed = true
        return `onChange={(value) => setValue(value ?? ${defaultValue})}`
      })

      if (fixed) {
        fs.writeFileSync(fullPath, content, 'utf8')
        console.log(`✅ Fixed: ${filePath}`)
        totalFixed++
      } else {
        console.log(`ℹ️  No issues found: ${filePath}`)
      }
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message)
    }
  })

  console.log(`\n🎉 Fixed ${totalFixed} files`)
  console.log('✅ All controlled input issues should now be resolved')
}

fixControlledInputs()

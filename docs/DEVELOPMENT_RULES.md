# Development Rules to Prevent Recurring Errors

## 1. Data Type Validation Rule
**ALWAYS validate data types before using them in critical operations.**

### Before using any data:
```javascript
// ❌ WRONG - Assumes items is an array
const aiEngine = new AIPredictionEngine(items)

// ✅ CORRECT - Validates data type first
const items = itemDataHook.items || []
const aiEngine = items.length > 0 ? new AIPredictionEngine(items) : null
```

### Common data validation patterns:
```javascript
// For arrays
const safeArray = data?.items || []
if (safeArray.length === 0) return null

// For objects
const safeObject = data?.config || {}
if (Object.keys(safeObject).length === 0) return null

// For strings
const safeString = data?.name || ''
if (!safeString.trim()) return null
```

## 2. Hook Rules Compliance
**NEVER call hooks inside loops, conditions, or nested functions.**

### ✅ CORRECT Hook Usage:
```javascript
function MyComponent() {
  // Hooks at top level only
  const [state, setState] = useState(null)
  const data = useQuery(...)
  const memoizedValue = useMemo(...)
  
  // Regular functions can use hooks
  const handleClick = () => {
    // But don't call hooks here!
  }
}
```

### ❌ WRONG Hook Usage:
```javascript
function MyComponent() {
  if (condition) {
    const [state, setState] = useState(null) // ❌ Hook in condition
  }
  
  const handleClick = () => {
    const data = useQuery(...) // ❌ Hook in function
  }
}
```

## 3. Import Path Validation Rule
**ALWAYS test import paths and use absolute paths when possible.**

### Import path checklist:
- [ ] Verify file exists at the specified path
- [ ] Check for correct file extensions (.jsx, .js, .ts, .tsx)
- [ ] Use absolute paths from src/ when possible
- [ ] Test imports in development environment

### Common import patterns:
```javascript
// ✅ Absolute paths (preferred)
import { formatPrice } from 'src/utils/utils.jsx'
import Component from 'src/components/MyComponent.jsx'

// ✅ Relative paths (when necessary)
import { formatPrice } from '../../../utils/utils.jsx'
import Component from '../components/MyComponent.jsx'

// ❌ Avoid complex relative paths
import { formatPrice } from '../../../../../../../utils/utils.jsx'
```

## 4. Error Boundary Rule
**ALWAYS wrap critical operations in try-catch blocks.**

### Error handling pattern:
```javascript
useEffect(() => {
  const processData = async () => {
    try {
      setLoading(true)
      const result = await riskyOperation()
      setData(result)
    } catch (error) {
      console.error('Operation failed:', error)
      setError(error.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  
  processData()
}, [dependencies])
```

## 5. Component Testing Rule
**ALWAYS test components in the browser before committing.**

### Testing checklist:
- [ ] Run `npm run dev` and visit the page
- [ ] Check browser console for errors
- [ ] Verify all imports resolve correctly
- [ ] Test component interactions
- [ ] Check for hook violations

### Quick test command:
```bash
# Start dev server
npm run dev

# Check if page loads without errors
curl -s "http://localhost:5174/your-page" | grep -i "error\|failed" || echo "✅ Page loads successfully"
```

## 6. Data Flow Validation Rule
**ALWAYS verify data flow from API to component.**

### Data flow checklist:
- [ ] API returns expected data structure
- [ ] Service layer processes data correctly
- [ ] Component receives correct props
- [ ] Component handles loading/error states
- [ ] Component renders without errors

## 7. State Management Rule
**ALWAYS initialize state with safe default values.**

### Safe state initialization:
```javascript
// ✅ Safe defaults
const [items, setItems] = useState([])
const [config, setConfig] = useState({})
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

// ❌ Unsafe defaults
const [items, setItems] = useState() // undefined
const [config, setConfig] = useState() // undefined
```

## 8. Component Structure Rule
**ALWAYS follow consistent component structure.**

### Standard component template:
```javascript
import React, { useState, useEffect, useMemo } from 'react'
import { Component } from '@mantine/core'
import { IconSomething } from '@tabler/icons-react'
import { utilityFunction } from '../utils/utils.jsx'

const MyComponent = ({ prop1, prop2 }) => {
  // 1. State declarations
  const [state, setState] = useState(null)
  
  // 2. Data fetching/processing
  const data = useMemo(() => {
    return processData(prop1, prop2)
  }, [prop1, prop2])
  
  // 3. Effects
  useEffect(() => {
    if (!data) return
    // Side effects
  }, [data])
  
  // 4. Event handlers
  const handleAction = () => {
    // Event logic
  }
  
  // 5. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

export default MyComponent
```

## 9. Debugging Rule
**ALWAYS add console logs for debugging complex operations.**

### Debugging pattern:
```javascript
useEffect(() => {
  console.log('🔍 Debug - Data received:', data)
  console.log('🔍 Debug - Data type:', typeof data)
  console.log('🔍 Debug - Is array:', Array.isArray(data))
  
  if (!Array.isArray(data)) {
    console.error('❌ Error - Expected array, got:', typeof data)
    return
  }
  
  // Process data
}, [data])
```

## 10. Performance Rule
**ALWAYS use useMemo and useCallback for expensive operations.**

### Performance optimization:
```javascript
// ✅ Memoized expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])

// ✅ Memoized callbacks
const handleClick = useCallback(() => {
  // Expensive operation
}, [dependencies])
```

## Enforcement
- **Before committing**: Run the testing checklist
- **When debugging**: Follow the debugging rule
- **When creating components**: Follow the component structure rule
- **When importing**: Follow the import path validation rule

## Common Error Patterns to Avoid
1. `TypeError: this.items.filter is not a function` → Use data validation rule
2. `Warning: Do not call Hooks inside useEffect` → Use hook rules compliance
3. `Failed to resolve import` → Use import path validation rule
4. `Cannot read property of undefined` → Use state management rule 
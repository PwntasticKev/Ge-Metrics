# Import Validation System

This document describes the import validation system implemented to prevent import errors with various packages like `@tabler/icons-react` and `@mantine/core`.

## Problem Statement

Import errors like `The requested module '/node_modules/.vite/deps/@tabler_icons-react.js?v=da79f5cd' does not provide an export named 'IconChart'` or `The requested module '/node_modules/.vite/deps/@mantine_core.js?v=da79f5cd' does not provide an export named 'DateInput'` can break the application build and development experience.

## Solution

We've implemented a validation system with the following components:

### 1. Validation Script (`scripts/validate-icons-simple.js`)

A lightweight validation script that:
- Checks for common problematic import patterns
- Provides helpful suggestions for correct import sources
- Runs as part of the build process
- Uses regex patterns to avoid false positives

### 2. Build Integration

The validation script is integrated into the build process via `package.json`:

```json
{
  "scripts": {
    "build": "npm run validate:icons && vite build",
    "validate:icons": "node scripts/validate-icons-simple.js"
  }
}
```

### 3. Common Import Mapping

| ❌ Incorrect | ✅ Correct Alternatives |
|-------------|------------------------|
| `IconChart` | `IconChartLine`, `IconChartBar`, `IconChartArea`, `IconChartHistogram` |
| `IconGauge` | `IconDashboard`, `IconSpeedometer` |
| `IconSkull` | `IconAlertTriangle`, `IconX` |
| `IconUnlock` | `IconLockOpen` |
| `IconInfo` | `IconInfoCircle` |
| `DateInput` from `@mantine/core` | `DateInput` from `@mantine/dates` |

## Recent Fixes Applied

✅ **IconChart → IconChartLine**: Fixed in `src/pages/Profile/index.jsx`  
✅ **DateInput import**: Fixed in `src/pages/Admin/UserManagement/index.jsx` (moved from `@mantine/core` to `@mantine/dates`)  
✅ **IconUnlock → IconLockOpen**: Fixed in `src/pages/Admin/UserManagement/index.jsx`  
✅ **IconInfo → IconInfoCircle**: Fixed in `src/pages/Admin/UserManagement/index.jsx`

## Best Practices

### 1. Always Verify Import Sources

Before using any component:
1. Check the package documentation for correct import sources
2. For Tabler icons: Visit [tabler-icons.io](https://tabler-icons.io/) to search for the icon
3. For Mantine components: Check [mantine.dev](https://mantine.dev/) documentation
4. Use your IDE's autocomplete when importing

### 2. Common Naming Patterns

**Tabler icons** follow these patterns:
- Base name: `IconHeart`
- Filled variant: `IconHeartFilled`
- Off/disabled variant: `IconHeartOff`
- Action variants: `IconHeartPlus`, `IconHeartMinus`, etc.
- Circle variants: `IconInfoCircle`, `IconCheckCircle`, etc.

**Mantine components** are organized by package:
- Core components: `@mantine/core`
- Date components: `@mantine/dates`
- Form components: `@mantine/form`
- Notifications: `@mantine/notifications`

### 3. IDE Setup

Configure your IDE for better import development:

#### VS Code
Add this to your settings.json for better autocomplete:
```json
{
  "typescript.suggest.autoImports": true,
  "javascript.suggest.autoImports": true
}
```

#### IntelliJ/WebStorm
Enable auto-import suggestions in Settings > Editor > General > Auto Import

### 4. Development Workflow

1. **Before adding a new import:**
   ```bash
   # Check if the import is valid
   npm run validate:icons
   ```

2. **When you get an import error:**
   - Check the error message for the exact component name
   - Search for the correct package in documentation
   - Update the import statement
   - Run validation again

3. **Before committing:**
   ```bash
   # Ensure all imports are valid
   npm run build
   ```

## Troubleshooting

### Common Error Messages

#### "does not provide an export named 'ComponentXXX'"
**Cause:** The component name doesn't exist in the specified package or is in a different package
**Solution:** 
1. Check package documentation for the correct import source
2. Look for the component in related packages (e.g., `@mantine/dates` instead of `@mantine/core`)
3. Update the import statement

#### "Cannot resolve module '@package/name'"
**Cause:** Package not installed or version mismatch
**Solution:**
```bash
npm install @package/name@latest
```

### Validation Script Errors

If the validation script reports false positives:
1. Check the regex patterns in `scripts/validate-icons-simple.js`
2. Add new patterns for additional problematic imports
3. Update the exclusion patterns for valid import variants

## Extending the Validation System

### Adding New Problematic Patterns

Edit `scripts/validate-icons-simple.js`:

```javascript
const problematicPatterns = [
  { pattern: /\bIconChart\b(?!Line|Bar|Area|Histogram|Pie|Donut|Arcs|Bubble|Candle|Dots)/, name: 'IconChart (standalone)' },
  { pattern: /\bIconGauge\b(?!Filled|Off)/, name: 'IconGauge' },
  { pattern: /\bIconUnlock\b/, name: 'IconUnlock (should be IconLockOpen)' },
  { pattern: /\bIconInfo\b(?!Circle)/, name: 'IconInfo (should be IconInfoCircle)' },
  { pattern: /import.*DateInput.*from.*@mantine\/core/, name: 'DateInput from @mantine/core (should be @mantine/dates)' },
  // Add new patterns here
  { pattern: /import.*NewComponent.*from.*@wrong\/package/, name: 'NewComponent from wrong package' }
];
```

### Creating a Comprehensive Validation

For a more thorough validation, you could:
1. Fetch the actual list of available exports from each package
2. Compare against all imports in the codebase
3. Generate suggestions based on string similarity

## Historical Context

This validation system was created after encountering multiple import errors:
- `IconChart` (should be `IconChartLine`) 
- `DateInput` from wrong package (should be from `@mantine/dates` not `@mantine/core`)
- `IconUnlock` (should be `IconLockOpen`)
- `IconInfo` (should be `IconInfoCircle`)

These errors broke the development server and required manual investigation to resolve.

The system prevents similar issues by:
- Catching common mistakes early
- Providing clear guidance on correct import sources
- Integrating validation into the development workflow
- Maintaining a knowledge base of common issues

## Maintenance

### Regular Updates

1. **Monthly:** Review package documentation for new components and import changes
2. **After package updates:** Test validation script with new package versions
3. **When adding new imports:** Update this documentation with any new patterns discovered

### Performance Considerations

The validation script is designed to be fast:
- Only scans JavaScript/TypeScript files
- Uses efficient regex patterns
- Skips node_modules and other irrelevant directories
- Provides early exit when no issues are found

## Related Files

- `scripts/validate-icons-simple.js` - Main validation script
- `package.json` - Build integration
- `src/pages/Profile/index.jsx` - Example of fixed IconChart → IconChartLine
- `src/pages/Admin/UserManagement/index.jsx` - Examples of fixed DateInput import, IconUnlock → IconLockOpen, IconInfo → IconInfoCircle 
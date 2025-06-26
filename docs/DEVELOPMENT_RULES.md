# Ge-Metrics Development Rules

## Core System Rules

### 1. Price Data Caching System
**CRITICAL**: All OSRS Grand Exchange price data must be served from cached database data, never directly from external APIs. See [PRICE_DATA_CACHING_RULES.md](./PRICE_DATA_CACHING_RULES.md) for complete implementation guidelines.

**Key Requirements:**
- Cron job runs every 2.5 minutes to fetch and cache price data
- All user requests served from database cache
- No direct API calls from user-facing endpoints
- Comprehensive error handling and monitoring
- Historical data tracking for charts and analysis

### 2. Mantine v6 Compatibility
**CRITICAL**: This project uses Mantine v6, NOT v7. Follow these patterns:

```jsx
// ✅ Correct (v6)
<Button leftIcon={<IconPlus />}>Add Item</Button>
<Tabs.Tab value="overview" icon={<IconDashboard />}>Overview</Tabs.Tab>
<TextInput icon={<IconSearch />} placeholder="Search..." />

// ❌ Wrong (v7)
<Button leftSection={<IconPlus />}>Add Item</Button>
<Tabs.Tab value="overview" leftSection={<IconDashboard />}>Overview</Tabs.Tab>
```

### 3. Testing Requirements
**MANDATORY**: Every new file must have comprehensive tests that pass before delivery:

- [ ] Create test files in `__tests__/` directory
- [ ] Use `.test.js` or `.test.jsx` extension
- [ ] Include unit tests, integration tests, and edge cases
- [ ] Mock external dependencies and API calls
- [ ] Test error handling and loading states
- [ ] Run `npm test` to verify all tests pass
- [ ] Achieve >80% test coverage

## 10. Controlled Input Rule
**ALWAYS handle undefined values in input onChange handlers to prevent controlled/uncontrolled input warnings.**

### The Problem:
React warns when an input's value changes from a defined value to undefined, causing it to switch from controlled to uncontrolled.

### The Solution:
Always provide safe default values in onChange handlers using the nullish coalescing operator (`??`).

### ✅ CORRECT Input Handling:
```javascript
// NumberInput components
<NumberInput
  value={minConfidence}
  onChange={(value) => setMinConfidence(value ?? 50)}
  min={0}
  max={100}
/>

// Select components
<Select
  value={sortBy}
  onChange={(value) => setSortBy(value ?? 'default')}
  data={[...]}
/>

// TextInput components
<TextInput
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.currentTarget.value || '')}
  placeholder="Search..."
/>
```

### ❌ WRONG Input Handling:
```javascript
// These can cause controlled/uncontrolled warnings
<NumberInput
  value={minConfidence}
  onChange={(value) => setMinConfidence(value)} // ❌ value can be undefined
/>

<Select
  value={sortBy}
  onChange={setSortBy} // ❌ value can be undefined
/>

<TextInput
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.currentTarget.value)} // ❌ can be undefined
/>
```

### Common Default Values:
```javascript
// Number inputs
onChange={(value) => setValue(value ?? 0)}
onChange={(value) => setValue(value ?? 100)}
onChange={(value) => setValue(value ?? 50)}

// String inputs
onChange={(e) => setValue(e.currentTarget.value || '')}
onChange={(value) => setValue(value ?? '')}

// Boolean inputs
onChange={(e) => setValue(e.currentTarget.checked)}
onChange={(value) => setValue(value ?? false)}
```

### Testing for Controlled Input Warnings:
```javascript
// In test files, spy on console.warn to catch these warnings
test('renders without controlled/uncontrolled input warnings', async () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  
  render(<MyComponent />)
  
  // Interact with inputs
  fireEvent.change(screen.getByLabelText('Input Label'), { target: { value: '' } })
  
  // Check that no controlled/uncontrolled warnings were logged
  const warnings = consoleSpy.mock.calls.filter(call => 
    call[0]?.includes('controlled input to be uncontrolled')
  )
  expect(warnings).toHaveLength(0)
  
  consoleSpy.mockRestore()
})
```

### Checklist for Input Components:
- [ ] All NumberInput onChange handlers use `value ?? defaultValue`
- [ ] All Select onChange handlers use `value ?? defaultValue`
- [ ] All TextInput onChange handlers use `e.currentTarget.value || ''`
- [ ] All Switch/Checkbox onChange handlers use `e.currentTarget.checked`
- [ ] Test clearing input values to ensure defaults are applied
- [ ] No console warnings about controlled/uncontrolled inputs 
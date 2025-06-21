# Chart Functionality - Core Features Documentation

## Overview
This document outlines the **CORE CHART FUNCTIONALITY** that must be preserved in all table components. These features are essential to the user experience and must never be removed or modified without thorough testing and approval.

## Core Chart Features

### 1. MiniChart Component in Table Rows
**Location**: `src/components/charts/MiniChart.jsx`
**Purpose**: Provides a small, inline chart preview in each table row showing price trends

**Required Implementation**:
- Must be rendered in every table row
- Must accept `itemId`, `width`, and `height` props
- Must display 1-hour historical data
- Must show last 20 data points
- Must have proper loading and error states

**Usage in Tables**:
```jsx
<MiniChart itemId={row.id} width={120} height={40} />
```

**Test Requirements**:
- Must test that MiniChart renders for each row
- Must test correct props are passed
- Must test loading states
- Must test error handling

### 2. Chart Button in Table Rows
**Purpose**: Button to open full chart modal with historical data and filters

**Required Implementation**:
- Must be present in every table row
- Must use `IconChartHistogram` icon
- Must open GraphModal when clicked
- Must pass correct item ID to modal

**Usage in Tables**:
```jsx
<Button variant="light" onClick={() => setGraphInfo(row.id)}>
  <IconChartHistogram size={14}/>
</Button>
```

**Test Requirements**:
- Must test button presence in each row
- Must test button click opens modal
- Must test correct item ID is passed
- Must test modal can be closed

### 3. GraphModal Component
**Location**: `src/shared/modals/graph-modal.jsx`
**Purpose**: Full-screen modal with comprehensive chart and historical data filters

**Required Implementation**:
- Must accept `opened`, `setOpened`, and `id` props
- Must render LineChart component
- Must be centered and large size
- Must handle modal state properly

**Usage**:
```jsx
<GraphModal opened={graphModal} setOpened={setGraphModal} id={selectedItem}/>
```

**Test Requirements**:
- Must test modal opens with correct item
- Must test modal closes properly
- Must test LineChart renders correctly

### 4. Chart Column in Table Headers
**Purpose**: Dedicated column for chart functionality

**Required Implementation**:
- Must have "Chart" header text
- Must be present in all table components
- Must be positioned before Settings column

**Test Requirements**:
- Must test "Chart" column header is present
- Must test column is in correct position

## Table Components Requiring Chart Functionality

### 1. All Items Table
**File**: `src/components/Table/all-items-table.jsx`
**Status**: ✅ IMPLEMENTED
**Features**:
- MiniChart in each row
- Chart button in each row
- GraphModal integration
- Chart column in header

### 2. Combination Items Table
**File**: `src/components/Table/item-sets-table.jsx`
**Status**: ✅ IMPLEMENTED
**Features**:
- MiniChart in each row
- Chart button in each row
- GraphModal integration
- Chart column in header

### 3. Watchlist Table
**File**: `src/components/Table/watchlist-table.jsx`
**Status**: 🔄 TO BE IMPLEMENTED
**Required Features**:
- MiniChart in each row
- Chart button in each row
- GraphModal integration
- Chart column in header

### 4. High Volumes Table
**File**: `src/components/Table/high-volumes-table.jsx`
**Status**: 🔄 TO BE IMPLEMENTED
**Required Features**:
- MiniChart in each row
- Chart button in each row
- GraphModal integration
- Chart column in header

## Testing Requirements

### Mandatory Tests for Each Table Component

1. **MiniChart Rendering Test**
   ```jsx
   test('renders MiniChart component in each row', () => {
     // Must verify MiniChart renders for each data item
     // Must verify correct props are passed
   })
   ```

2. **Chart Button Test**
   ```jsx
   test('renders chart button in each row', () => {
     // Must verify chart button is present in each row
   })
   ```

3. **GraphModal Integration Test**
   ```jsx
   test('opens GraphModal when chart button is clicked', () => {
     // Must verify modal opens when button is clicked
     // Must verify correct item ID is passed
   })
   ```

4. **Chart Column Test**
   ```jsx
   test('renders table with all columns including chart column', () => {
     // Must verify "Chart" column header is present
   })
   ```

### Test Coverage Requirements
- **Minimum Coverage**: 90% for chart-related functionality
- **Required Tests**: All mandatory tests must pass
- **Integration Tests**: Must test full chart workflow

## Implementation Checklist

### For New Table Components
- [ ] Import MiniChart component
- [ ] Import GraphModal component
- [ ] Add chart state management (`graphModal`, `selectedItem`)
- [ ] Add `setGraphInfo` function
- [ ] Add MiniChart to each row
- [ ] Add chart button to each row
- [ ] Add GraphModal component
- [ ] Add "Chart" column to header
- [ ] Write comprehensive tests
- [ ] Verify all tests pass

### For Existing Table Components
- [ ] Verify MiniChart is present in each row
- [ ] Verify chart button is present in each row
- [ ] Verify GraphModal integration works
- [ ] Verify "Chart" column header is present
- [ ] Run all chart-related tests
- [ ] Verify test coverage meets requirements

## Code Review Checklist

### Before Merging Any Table Changes
- [ ] MiniChart component is imported and used
- [ ] Chart button is present in each row
- [ ] GraphModal is imported and integrated
- [ ] "Chart" column header is present
- [ ] All chart-related tests pass
- [ ] Test coverage meets minimum requirements
- [ ] No chart functionality was removed or modified

## Breaking Changes Policy

### What Constitutes a Breaking Change
- Removing MiniChart from table rows
- Removing chart buttons from table rows
- Removing GraphModal integration
- Removing "Chart" column from headers
- Modifying chart functionality without tests

### Approval Process for Chart Changes
1. **Documentation**: Must document why change is needed
2. **Testing**: Must provide comprehensive test coverage
3. **Review**: Must be reviewed by senior developer
4. **Approval**: Must be approved by project lead
5. **Rollback Plan**: Must have rollback strategy

## Maintenance Guidelines

### Regular Maintenance Tasks
- [ ] Monthly: Review chart functionality in all tables
- [ ] Monthly: Run all chart-related tests
- [ ] Monthly: Verify test coverage requirements
- [ ] Quarterly: Update chart documentation
- [ ] Quarterly: Review chart performance

### Performance Monitoring
- Monitor MiniChart rendering performance
- Monitor GraphModal loading times
- Monitor chart data API calls
- Monitor user interaction with chart features

## Troubleshooting

### Common Issues
1. **MiniChart not rendering**: Check imports and props
2. **Chart button not working**: Check event handlers and state
3. **GraphModal not opening**: Check modal state management
4. **Tests failing**: Check mock implementations

### Debug Steps
1. Check component imports
2. Verify state management
3. Check event handlers
4. Review test implementations
5. Check console for errors

## Conclusion

Chart functionality is a **CORE FEATURE** of the Ge-Metrics application. It provides essential value to users by allowing them to visualize price trends and make informed trading decisions. This functionality must be preserved and maintained across all table components.

**Remember**: Any changes to chart functionality must be thoroughly tested and documented. When in doubt, preserve existing functionality and add new features rather than modifying existing ones.

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: Development Team
**Review Schedule**: Monthly 
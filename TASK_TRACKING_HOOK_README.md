# Task Tracking Hook System

## Overview
Automated task tracking system that monitors all development activities and maintains a comprehensive log in `TASKS.md`.

## Features

### 🎯 Automatic Task Tracking
- **Post-commit hook** automatically logs every commit to TASKS.md
- Tracks commit type, description, test files, and status
- Links each task to its commit hash for traceability

### 📊 Test Status Detection
The system automatically detects test status:
- **🔴 RED** - Test files added (TDD red phase)
- **🟢 GREEN** - Tests and source files modified together
- **🔄 REFACTOR** - Code improvements with passing tests
- **✅ COMPLETE** - Task finished with all tests passing
- **⚠️ NO TEST** - Warning when source files modified without tests
- **⏳ PENDING** - Status undetermined

### 🔍 Pre-push Validation
Before pushing, the system:
- Validates all tasks are documented
- Checks for missing tests
- Ensures TASKS.md is up to date
- Warns about incomplete tasks

## Usage

### Commit Message Format
Use conventional commit format for best results:
```bash
type(scope): description [test:status]

# Examples:
feat(profile): add user dashboard [test:green]
fix(auth): resolve login issue [test:red]
test(footer): add component tests [test:complete]
refactor(api): optimize data fetching [test:refactor]
```

### Supported Types
- `feat` - New feature
- `fix` - Bug fix
- `test` - Adding tests
- `docs` - Documentation
- `refactor` - Code refactoring
- `chore` - Maintenance
- `style` - Code style changes
- `perf` - Performance improvements

## Configuration

Edit `.tasktracker.json` to customize:
```json
{
  "enabled": true/false,           // Enable/disable tracking
  "tasksFile": "TASKS.md",        // Output file
  "requireTests": true,            // Warn if no tests
  "autoStatus": true,              // Auto-detect status
  "validation": {
    "requireTestsForSource": true,  // Enforce tests for source
    "warnOnMissingTests": true,     // Show warnings
    "blockOnFailingTests": false    // Block push on issues
  }
}
```

## Manual Commands

### Track Current Commit
```bash
node scripts/track-task.cjs
```

### Validate Tasks
```bash
node scripts/validate-tasks.cjs
```

### Disable Temporarily
```bash
# Edit .tasktracker.json
# Set "enabled": false
```

## How It Works

1. **On Commit**: Post-commit hook runs `track-task.cjs`
2. **Parse**: Extracts commit info and changed files
3. **Detect**: Determines test status from file changes
4. **Update**: Appends entry to TASKS.md
5. **On Push**: Validates all tasks are tracked

## TASKS.md Format

Entries are automatically added:
```markdown
| Date | Type | Task | Test File | Status | Commit |
|------|------|------|-----------|--------|--------|
| 2026-01-20 | feat | add dashboard | Dashboard.test.jsx | 🟢 GREEN | abc123 |
```

## Troubleshooting

### Hook Not Running
```bash
# Ensure hooks are executable
chmod +x .husky/post-commit
chmod +x .husky/pre-push
```

### Script Errors
```bash
# Check Node.js is installed
node --version

# Verify scripts exist
ls -la scripts/track-task.cjs
ls -la scripts/validate-tasks.cjs
```

### Disable for Single Commit
```bash
# Skip hooks temporarily
git commit --no-verify -m "message"
```

## Benefits

✅ **Automatic Documentation** - Never forget to document tasks
✅ **Test Coverage Tracking** - Ensures tests are written
✅ **Progress Visibility** - See task status at a glance
✅ **Commit Traceability** - Link tasks to commits
✅ **Quality Enforcement** - Warns about missing tests

## Integration with CI/CD

The task tracking integrates with existing quality checks:
- Pre-commit: Linting, TypeScript, test coverage
- Post-commit: Task tracking
- Pre-push: Full test suite, build, validation

---

**Note**: This system complements but doesn't replace proper test-driven development practices. Always write tests first!
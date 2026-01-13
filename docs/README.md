# Documentation

This directory contains documentation for the GE-Metrics project and related tools.

## 📚 Available Documentation

### Claude Code Documentation (`claude-code/`)
Automatically synced documentation from Anthropic's Claude Code tool.

**Quick Access:**
```bash
# View all available docs
npm run docs:claude:list

# Search for specific topics
npm run docs:claude:search "github actions"

# Open specific documentation
./scripts/claude-docs-helper.sh open quickstart

# Sync latest documentation
npm run docs:sync
```

**Auto-Sync**: Documentation is automatically updated daily via GitHub Actions.

### Project Documentation
- **Setup Guides**: `setup/` - Development environment setup
- **API Documentation**: `API_STRUCTURE.md` - API structure and endpoints
- **Legacy Documentation**: `legacy/` - Historical implementation details

## 🔄 Keeping Documentation Updated

### Automatic Updates
- **Claude Code docs**: Updated daily at 6 AM UTC via GitHub Actions
- **Workflow**: See `.github/workflows/sync-claude-docs.yml`

### Manual Updates
```bash
# Sync Claude Code documentation
npm run docs:sync

# Search documentation
npm run docs:claude:search "plugins"

# View documentation map
npm run docs:claude:map
```

## 📖 Quick Reference

### Claude Code Common Tasks
```bash
# Getting started
npm run docs:claude:search "quickstart"

# Plugin development
npm run docs:claude:search "plugins"

# GitHub Actions integration
npm run docs:claude:search "github"

# Configuration settings
npm run docs:claude:search "settings"
```

### Documentation Structure
```
docs/
├── claude-code/           # Claude Code documentation (auto-synced)
│   ├── README.md         # Documentation index
│   ├── claude-code-docs.txt  # Complete documentation map
│   ├── getting-started/   # Installation and setup
│   ├── configuration/     # Settings and config
│   ├── reference/         # Command reference
│   ├── plugins/          # Plugin development
│   └── workflows/        # GitHub Actions
├── setup/                # Project setup guides
├── legacy/               # Historical documentation
└── README.md            # This file
```

## 🚀 Benefits of Local Documentation

1. **Offline Access**: Documentation available without internet
2. **Version Control**: Track documentation changes with your code
3. **Search Integration**: Quickly find relevant information
4. **Development Context**: Documentation alongside your code
5. **Team Sync**: Everyone has the same documentation version

## 🔗 External Links

- **Claude Code Official Docs**: https://code.claude.com/docs/
- **Claude Code GitHub**: https://github.com/anthropics/claude-code
- **Claude Code Actions**: https://github.com/anthropics/claude-code-action

---

*Documentation last updated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")*
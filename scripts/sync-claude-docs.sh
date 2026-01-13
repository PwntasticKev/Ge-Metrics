#!/bin/bash

# Claude Code Documentation Sync Script
# Manually sync Claude Code documentation to local repository

set -e

echo "🚀 Starting Claude Code documentation sync..."

# Create docs directory
mkdir -p docs/claude-code/{getting-started,configuration,reference,plugins,workflows}

echo "📥 Downloading Claude Code documentation map..."
curl -s "https://code.claude.com/docs/llms.txt" > docs/claude-code/claude-code-docs.txt

echo "📥 Downloading Claude Code documentation files..."

# Download main documentation files (these URLs are examples - adjust based on actual structure)
urls=(
    "https://code.claude.com/docs/en/getting-started/installation.md|docs/claude-code/getting-started/installation.md"
    "https://code.claude.com/docs/en/configuration/settings.md|docs/claude-code/configuration/settings.md"
    "https://code.claude.com/docs/en/reference/commands.md|docs/claude-code/reference/commands.md"
    "https://code.claude.com/docs/en/plugins/overview.md|docs/claude-code/plugins/overview.md"
    "https://code.claude.com/docs/en/workflows/github-actions.md|docs/claude-code/workflows/github-actions.md"
)

for url_path in "${urls[@]}"; do
    IFS='|' read -r url file_path <<< "$url_path"
    echo "  Downloading: $url"
    curl -s "$url" > "$file_path" 2>/dev/null || echo "# Documentation unavailable at $url" > "$file_path"
done

echo "📥 Fetching Claude Code repository documentation..."
git clone --depth=1 https://github.com/anthropics/claude-code.git temp-claude-code

# Copy documentation files if they exist
if [ -d "temp-claude-code/docs" ]; then
    echo "  Copying repository docs..."
    cp -r temp-claude-code/docs/* docs/claude-code/ 2>/dev/null || true
fi

if [ -f "temp-claude-code/README.md" ]; then
    echo "  Copying main README..."
    cp temp-claude-code/README.md docs/claude-code/claude-code-readme.md
fi

# Copy any markdown files from root
echo "  Copying additional markdown files..."
find temp-claude-code -maxdepth 1 -name "*.md" -exec cp {} docs/claude-code/ \; 2>/dev/null || true

# Cleanup
rm -rf temp-claude-code

echo "📝 Generating documentation index..."
cat > docs/claude-code/README.md << EOF
# Claude Code Documentation

This directory contains automatically synced documentation for Claude Code from Anthropic.

## 📚 Documentation Sources

- **Official Documentation**: https://code.claude.com/docs/
- **GitHub Repository**: https://github.com/anthropics/claude-code
- **Last Updated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## 📁 Structure

- \`getting-started/\` - Installation and setup guides
- \`configuration/\` - Settings and configuration options
- \`reference/\` - Command reference and API docs
- \`plugins/\` - Plugin development and usage
- \`workflows/\` - GitHub Actions and workflow integration
- \`claude-code-docs.txt\` - Complete documentation map

## 🔄 Auto-Sync

This documentation is automatically updated daily via GitHub Actions.
Last sync: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## 📖 Quick Links

- [Installation Guide](getting-started/installation.md)
- [Configuration Settings](configuration/settings.md)
- [Command Reference](reference/commands.md)
- [Plugin Development](plugins/overview.md)
- [GitHub Actions Integration](workflows/github-actions.md)

## 📋 Available Files

EOF

# List all files in the docs directory
find docs/claude-code -type f -name "*.md" | sort | while read -r file; do
    echo "- [\`$(basename "$file")\`]($file)" >> docs/claude-code/README.md
done

echo "" >> docs/claude-code/README.md
echo "---" >> docs/claude-code/README.md
echo "*Documentation synced from [Claude Code](https://github.com/anthropics/claude-code)*" >> docs/claude-code/README.md

echo "📝 Updating main CLAUDE.md..."
# Add Claude Code docs reference if not already present
if ! grep -q "Claude Code Documentation" CLAUDE.md; then
    cat >> CLAUDE.md << 'EOF'

---

## 📚 Claude Code Documentation

Local Claude Code documentation is automatically synced and available in:
- `docs/claude-code/` - Complete Claude Code documentation
- Updated daily via GitHub Actions
- See [docs/claude-code/README.md](docs/claude-code/README.md) for structure

Quick reference: `docs/claude-code/claude-code-docs.txt` contains the full documentation map.

EOF
fi

echo "✅ Claude Code documentation sync completed!"
echo ""
echo "📁 Documentation available in: docs/claude-code/"
echo "📖 Start with: docs/claude-code/README.md"
echo "🔄 Auto-sync: GitHub Action will run daily"
echo ""
echo "🚀 To manually run sync again: ./scripts/sync-claude-docs.sh"
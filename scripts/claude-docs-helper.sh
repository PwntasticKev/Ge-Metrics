#!/bin/bash

# Claude Code Documentation Helper
# Quick access to Claude Code documentation

set -e

DOCS_DIR="docs/claude-code"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${BLUE}Claude Code Documentation Helper${NC}"
    echo ""
    echo -e "${GREEN}Usage:${NC}"
    echo "  ./scripts/claude-docs-helper.sh [command] [topic]"
    echo "  npm run docs:claude:help"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  list, ls         - List all available documentation"
    echo "  search [topic]   - Search for documentation by topic"
    echo "  open [topic]     - Open specific documentation"
    echo "  sync             - Sync latest Claude Code documentation"
    echo "  map              - Show complete documentation map"
    echo "  help             - Show this help"
    echo ""
    echo -e "${GREEN}Topics:${NC}"
    echo "  quickstart       - Getting started guide"
    echo "  setup            - Installation and setup"
    echo "  plugins          - Plugin development"
    echo "  hooks            - Hooks and customization"
    echo "  github           - GitHub Actions integration"
    echo "  settings         - Configuration settings"
    echo "  security         - Security best practices"
    echo "  mcp              - Model Context Protocol"
    echo "  skills           - Agent Skills"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  ./scripts/claude-docs-helper.sh search plugins"
    echo "  ./scripts/claude-docs-helper.sh open quickstart"
    echo "  npm run docs:claude:search github"
}

list_docs() {
    echo -e "${BLUE}📚 Available Claude Code Documentation:${NC}"
    echo ""
    
    if [ ! -d "$DOCS_DIR" ]; then
        echo -e "${RED}❌ Documentation not found. Run: npm run docs:sync${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}📁 Directories:${NC}"
    find "$DOCS_DIR" -type d -not -path "$DOCS_DIR" | sort | while read -r dir; do
        echo "  $(basename "$dir")/"
    done
    
    echo ""
    echo -e "${GREEN}📄 Documentation Files:${NC}"
    find "$DOCS_DIR" -name "*.md" | sort | while read -r file; do
        rel_path=${file#$DOCS_DIR/}
        echo "  $rel_path"
    done
}

search_docs() {
    local query="$1"
    
    if [ -z "$query" ]; then
        echo -e "${RED}❌ Please provide a search term${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🔍 Searching Claude Code docs for: ${YELLOW}$query${NC}"
    echo ""
    
    if [ ! -f "$DOCS_DIR/claude-code-docs.txt" ]; then
        echo -e "${RED}❌ Documentation not found. Run: npm run docs:sync${NC}"
        exit 1
    fi
    
    # Search in the main docs file
    grep -i "$query" "$DOCS_DIR/claude-code-docs.txt" | while read -r line; do
        echo -e "${GREEN}•${NC} $line"
    done
    
    echo ""
    echo -e "${BLUE}📁 Files containing '$query':${NC}"
    find "$DOCS_DIR" -name "*.md" -exec grep -l -i "$query" {} \; | while read -r file; do
        rel_path=${file#$DOCS_DIR/}
        echo -e "${GREEN}•${NC} $rel_path"
    done
}

open_doc() {
    local topic="$1"
    
    if [ -z "$topic" ]; then
        echo -e "${RED}❌ Please specify a topic to open${NC}"
        exit 1
    fi
    
    local doc_file=""
    
    # Map common topics to files
    case "$topic" in
        "quickstart"|"start"|"getting-started")
            doc_file="https://code.claude.com/docs/en/quickstart.md"
            ;;
        "setup"|"install"|"installation")
            doc_file="https://code.claude.com/docs/en/setup.md"
            ;;
        "plugins"|"plugin")
            doc_file="https://code.claude.com/docs/en/plugins.md"
            ;;
        "hooks"|"hook")
            doc_file="https://code.claude.com/docs/en/hooks.md"
            ;;
        "github"|"github-actions"|"actions")
            doc_file="https://code.claude.com/docs/en/github-actions.md"
            ;;
        "settings"|"config"|"configuration")
            doc_file="https://code.claude.com/docs/en/settings.md"
            ;;
        "security"|"sec")
            doc_file="https://code.claude.com/docs/en/security.md"
            ;;
        "mcp"|"model-context-protocol")
            doc_file="https://code.claude.com/docs/en/mcp.md"
            ;;
        "skills"|"agent-skills")
            doc_file="https://code.claude.com/docs/en/skills.md"
            ;;
        "overview")
            doc_file="https://code.claude.com/docs/en/overview.md"
            ;;
        *)
            # Try to find a matching file
            if [ -f "$DOCS_DIR/$topic.md" ]; then
                doc_file="$DOCS_DIR/$topic.md"
            elif [ -f "$DOCS_DIR/claude-code-readme.md" ] && grep -q -i "$topic" "$DOCS_DIR/claude-code-readme.md"; then
                doc_file="$DOCS_DIR/claude-code-readme.md"
            else
                echo -e "${RED}❌ Topic '$topic' not found${NC}"
                echo -e "${BLUE}💡 Try: ./scripts/claude-docs-helper.sh search $topic${NC}"
                exit 1
            fi
            ;;
    esac
    
    echo -e "${BLUE}📖 Opening Claude Code documentation for: ${YELLOW}$topic${NC}"
    echo -e "${GREEN}🔗 $doc_file${NC}"
    
    # Try to open in browser (macOS/Linux)
    if command -v open > /dev/null; then
        open "$doc_file"
    elif command -v xdg-open > /dev/null; then
        xdg-open "$doc_file"
    else
        echo -e "${YELLOW}💡 Manual link: $doc_file${NC}"
    fi
}

show_map() {
    echo -e "${BLUE}🗺️ Claude Code Documentation Map:${NC}"
    echo ""
    
    if [ ! -f "$DOCS_DIR/claude-code-docs.txt" ]; then
        echo -e "${RED}❌ Documentation not found. Run: npm run docs:sync${NC}"
        exit 1
    fi
    
    cat "$DOCS_DIR/claude-code-docs.txt"
}

sync_docs() {
    echo -e "${BLUE}🔄 Syncing Claude Code documentation...${NC}"
    ./scripts/sync-claude-docs.sh
}

# Main script logic
case "${1:-help}" in
    "list"|"ls")
        list_docs
        ;;
    "search")
        search_docs "$2"
        ;;
    "open")
        open_doc "$2"
        ;;
    "map")
        show_map
        ;;
    "sync")
        sync_docs
        ;;
    "help"|"--help"|"-h"|*)
        show_help
        ;;
esac
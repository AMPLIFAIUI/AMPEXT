# AMP Project Context

This file is automatically loaded by VS Code to provide permanent codebase context.

## Project: A.M.P (Auto Memory Persistence)
- **Type**: Chrome Extension + Electron Desktop App  
- **Architecture**: Native Messaging Only
- **Storage**: SQLite database + 5x1MB hot memory pool
- **Purpose**: Infinite context memory system for AI conversations

## Core Components:
- `ext/` - Chrome extension (Manifest V3)
- `desktop-ui/` - Electron desktop application
- `amp-native-host.js` - Native messaging bridge
- `docs/` - Architecture documentation

## Memory Architecture:
- **5x1MB Hot Memory Pool** with cascading overflow
- **Dual Zipper Architecture** (Fat + Thin zippers)
- **Fluid Backward Rolling** when user scrolls
- **Previous Chat Detection** and context restoration

## Key Implementation Rules:
1. **Native messaging only** - No HTTP servers
2. **Data preservation** - Never lose memory, archive to slot 9
3. **Fluid indexing** - System adapts to user navigation
4. **Storage consistency** - Maintain size limits across components

## Current Status:
- ✅ Basic memory system implemented
- ✅ Native messaging working
- ✅ Electron GUI functional
- ❌ Text highlighting needs implementation
- ❌ Dual zipper architecture missing
- ❌ Backward rolling not implemented
- ❌ SQLite indexing incomplete

See `.vscode/codebase-context.json` for detailed technical specifications.

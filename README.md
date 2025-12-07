# AMP - Automatic Memory Persistence

AMP is a browser extension that captures and persists your AI conversations locally. It uses a dual zipper memory architecture with native messaging to store data in SQLite on your desktop.

## Core Features

- **Dual Zipper Architecture**: Fat zipper (full S1-S9 blocks) + Thin zipper (compressed S9 tags)
- **5MB Hot Memory Pool**: 5 slots of 1MB each with temperature-based prioritization
- **Native Messaging**: Chrome extension communicates with desktop app via `com.ampiq.amp.native`
- **SQLite Storage**: Persistent local storage in `~/.ampiq/AMP/memory.db`
- **AES-256 Encryption**: All sensitive data encrypted at rest
- **Cross-Tab Communication**: Real-time data sharing across browser tabs
- **Provider Detection**: Auto-detects ChatGPT, Claude, Gemini, Perplexity, Poe, etc.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER EXTENSION                           │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │ Content.js  │───▶│ Background.js │───▶│ Native Messaging Port │  │
│  │ (Captures)  │    │ (Memory Pool) │    │ (chrome.runtime)      │  │
│  └─────────────┘    └──────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ stdin/stdout (4-byte length prefix)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NATIVE MESSAGING HOST                          │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │ amp-native-host │───▶│ sqlite-storage.js │───▶│  memory.db    │  │
│  │ (Node.js)       │    │ (better-sqlite3)  │    │  (SQLite)     │  │
│  └─────────────────┘    └──────────────────┘    └────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ IPC
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DESKTOP APP (Electron)                      │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │  main.js    │───▶│ renderer.js  │───▶│     index.html        │  │
│  │ (Main Proc) │    │ (UI Process) │    │     (Dashboard)       │  │
│  └─────────────┘    └──────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory System

### Dual Zipper
- **Fat Zipper**: Full S1-S9 conversation blocks (~1KB per block)
- **Thin Zipper**: Compressed S9 tags for fast search (~256 bytes per tag)

### S1-S9 Progression
```
S1 (Raw Capture) → S2-S8 (Processing) → S9 (Canonical Summary)
```

### Hot Memory Pool
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Slot 1  │ Slot 2  │ Slot 3  │ Slot 4  │ Slot 5  │
│ (1MB)   │ (1MB)   │ (1MB)   │ (1MB)   │ (1MB)   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
         ↓ Overflow cascades to SQLite storage
```

## Installation

### Extension
1. Clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `ext/` folder

### Native Messaging Host (Windows)

**Automatic Setup (Recommended):**
1. Run the setup script in PowerShell:
```powershell
.\setup-native-host.ps1
```
2. Enter your Chrome extension ID when prompted (find it in `chrome://extensions/`)
3. Restart Chrome completely

**Manual Setup:**
1. Copy `com.ampiq.amp.native.json.template` to `com.ampiq.amp.native.json` (or edit the existing one)
2. Update `com.ampiq.amp.native.json`:
   - Replace `REPLACE_WITH_ABSOLUTE_PATH_TO_amp-native-host.bat` with the absolute path to `amp-native-host.bat` in your installation directory
   - Replace `YOUR_EXTENSION_ID_HERE` with your actual extension ID (format: `chrome-extension://YOUR_EXTENSION_ID/`)
3. Register in Windows registry (PowerShell as admin):
   - Replace `YOUR_INSTALLATION_DIRECTORY` in the script below with the actual path where you installed AMP:
```powershell
$regPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"
$manifestPath = "YOUR_INSTALLATION_DIRECTORY\com.ampiq.amp.native.json"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "(Default)" -Value $manifestPath
```
   - Or use this version that auto-detects the current directory:
```powershell
$regPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"
$manifestPath = (Resolve-Path "com.ampiq.amp.native.json").Path
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "(Default)" -Value $manifestPath
```
4. Restart Chrome completely

### Desktop App
```bash
cd desktop-ui
npm install
npm start
```

## License Activation

Use one of these developer keys for full access:
- `AMP-DEV-OWNER-2025`
- `AMP-LIFETIME-OWNER`
- `AMPIQ-MASTER-KEY-001`

Enter in extension dropdown → Settings → License Key

## File Structure

```
AMPEXT/
├── ext/                          # Chrome extension
│   ├── manifest.json             # Extension manifest (v3)
│   ├── background.js             # Service worker, memory pool
│   ├── content.js                # Page content capture
│   ├── utils.js                  # MemoryPool, Dual Zipper
│   ├── license.js                # License validation
│   ├── dropdown.html/js          # Popup UI
│   └── animated logo/            # Ring animation frames
│
├── desktop-ui/                   # Electron desktop app
│   ├── main.js                   # Electron main process
│   ├── renderer.js               # UI renderer
│   ├── index.html                # Dashboard UI
│   ├── sqlite-storage.js         # SQLite wrapper
│   └── preload.js                # IPC bridge
│
├── website/                      # Product website
│   ├── index.html                # Landing page
│   └── assets/                   # Images, logos
│
├── amp-native-host.js            # Native messaging host
├── amp-native-host.bat           # Windows launcher
├── com.ampiq.amp.native.json     # Native host manifest
└── README.md                     # This file
```

## Supported AI Platforms

- ChatGPT (chat.openai.com, chatgpt.com)
- Claude (claude.ai)
- Google Gemini (gemini.google.com)
- Perplexity (perplexity.ai)
- Poe (poe.com)
- Character.ai (character.ai)
- You.com (you.com)
- Blackbox AI (blackbox.ai)

## Development

### Testing
```bash
# Start desktop app in dev mode
cd desktop-ui && npm start

# Reload extension after code changes
# chrome://extensions/ → Reload

# Check native messaging
# Look for "Native Host: Received message" in terminal
```

### Build
```bash
cd desktop-ui
npm run build
```

## Animated Ring States

| State | Color | Meaning |
|-------|-------|---------|
| normal | 🌈 Rainbow | Connected, working |
| processing | 🌈+🟡 | Processing content |
| idle | 🔵 Blue | Idle/waiting |
| not-ai-site | 🌈+🔵 | Connected, not on AI site |
| error | 🔴 Red | Error state |

## Security

- All data stored locally (no cloud)
- AES-256 encryption for sensitive data
- Native messaging uses Chrome's secure channel
- No external API calls except license validation

## License

© 2025 AMPIQ. All rights reserved.

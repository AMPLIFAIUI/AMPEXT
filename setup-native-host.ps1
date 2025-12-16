# AMP Native Messaging Host Setup Script
# Properly configures native messaging for Chrome extension

param(
    [string]$ExtensionId = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "AMP Native Messaging Host Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get installation directory
$InstallDir = $PSScriptRoot
Write-Host "Installation directory: $InstallDir" -ForegroundColor Green

# Validate required files exist
$RequiredFiles = @(
    "amp-native-host.bat",
    "amp-native-host.js",
    "com.ampiq.amp.native.json.template"
)

foreach ($file in $RequiredFiles) {
    $filePath = Join-Path $InstallDir $file
    if (-not (Test-Path $filePath)) {
        Write-Host "ERROR: Required file not found: $file" -ForegroundColor Red
        exit 1
    }
}

# Get extension ID if not provided
if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
    Write-Host "Please enter your Chrome Extension ID:" -ForegroundColor Yellow
    Write-Host "(Find it in chrome://extensions/ - it's a 32-character string)" -ForegroundColor Gray
    $ExtensionId = Read-Host "Extension ID"
}

# Validate extension ID format
if ($ExtensionId -notmatch '^[a-z]{32}$') {
    Write-Host "ERROR: Invalid extension ID format. Must be 32 lowercase letters." -ForegroundColor Red
    exit 1
}

Write-Host "Using Extension ID: $ExtensionId" -ForegroundColor Green

# Generate manifest file
$ManifestPath = Join-Path $InstallDir "com.ampiq.amp.native.json"
$BatPath = Join-Path $InstallDir "amp-native-host.bat"
$ExtensionOrigin = "chrome-extension://$ExtensionId/"

$ManifestContent = @{
    name = "com.ampiq.amp.native"
    description = "AMP Native Messaging Host - Stores AI conversation memory"
    path = $BatPath
    type = "stdio"
    allowed_origins = @($ExtensionOrigin)
} | ConvertTo-Json -Depth 10

Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8
Write-Host "Generated manifest: $ManifestPath" -ForegroundColor Green

# Register in Windows Registry
$RegPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"

Write-Host "Registering in Windows Registry..." -ForegroundColor Yellow

try {
    if (Test-Path $RegPath) {
        Remove-Item -Path $RegPath -Force
    }
    New-Item -Path $RegPath -Force | Out-Null
    Set-ItemProperty -Path $RegPath -Name "(Default)" -Value $ManifestPath
    Write-Host "Registry entry created successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create registry entry: $_" -ForegroundColor Red
    exit 1
}

# Verify Node.js is installed
try {
    $NodeVersion = node --version
    Write-Host "Node.js version: $NodeVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Write-Host "The native messaging host requires Node.js to run." -ForegroundColor Red
}

# Install dependencies
$DesktopUiPath = Join-Path $InstallDir "desktop-ui"
if (Test-Path $DesktopUiPath) {
    Write-Host "Installing desktop app dependencies..." -ForegroundColor Yellow
    Push-Location $DesktopUiPath
    try {
        npm install --production
        Write-Host "Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Failed to install dependencies: $_" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Chrome completely (close all windows)" -ForegroundColor White
Write-Host "2. Reload the AMP extension in chrome://extensions/" -ForegroundColor White
Write-Host "3. The extension should now connect to the native host" -ForegroundColor White
Write-Host ""
Write-Host "To verify the connection, check the extension popup." -ForegroundColor Gray
Write-Host ""

# AMP Native Messaging Host Setup Script
# Automatically configures native messaging with correct paths

param(
    [string]$ExtensionId = ""
)

Write-Host "AMP Native Messaging Host Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory (where this script is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManifestPath = Join-Path $ScriptDir "com.ampiq.amp.native.json"
$HostBatPath = Join-Path $ScriptDir "amp-native-host.bat"
$HostJsPath = Join-Path $ScriptDir "amp-native-host.js"

# Verify files exist
if (-not (Test-Path $HostBatPath)) {
    Write-Error "amp-native-host.bat not found at: $HostBatPath"
    exit 1
}

if (-not (Test-Path $HostJsPath)) {
    Write-Error "amp-native-host.js not found at: $HostJsPath"
    exit 1
}

# Normalize paths (use forward slashes for JSON, but Windows needs backslashes escaped)
$NormalizedBatPath = $HostBatPath -replace '\\', '\\'

# Read current manifest
$manifest = @{
    name = "com.ampiq.amp.native"
    description = "AMP Native Messaging Host - Stores AI conversation memory"
    path = $HostBatPath
    type = "stdio"
    allowed_origins = @()
}

# Get extension ID if not provided
if ([string]::IsNullOrEmpty($ExtensionId)) {
    Write-Host "To find your extension ID:" -ForegroundColor Yellow
    Write-Host "1. Go to chrome://extensions/" -ForegroundColor Yellow
    Write-Host "2. Enable 'Developer mode'" -ForegroundColor Yellow
    Write-Host "3. Find your extension and copy the ID" -ForegroundColor Yellow
    Write-Host ""
    $ExtensionId = Read-Host "Enter your Chrome extension ID (or press Enter to skip)"
}

# Add extension IDs to allowed_origins
if (-not [string]::IsNullOrEmpty($ExtensionId)) {
    $ExtensionId = $ExtensionId.Trim()
    if (-not $ExtensionId.StartsWith("chrome-extension://")) {
        $ExtensionId = "chrome-extension://$ExtensionId/"
    }
    if (-not $ExtensionId.EndsWith("/")) {
        $ExtensionId = "$ExtensionId/"
    }
    $manifest.allowed_origins += $ExtensionId
    Write-Host "Added extension ID: $ExtensionId" -ForegroundColor Green
} else {
    Write-Host "No extension ID provided - you'll need to add it manually to the manifest" -ForegroundColor Yellow
}

# Add default extension IDs if manifest exists and has them
if (Test-Path $ManifestPath) {
    try {
        $existing = Get-Content $ManifestPath | ConvertFrom-Json
        if ($existing.allowed_origins) {
            foreach ($origin in $existing.allowed_origins) {
                if ($manifest.allowed_origins -notcontains $origin) {
                    $manifest.allowed_origins += $origin
                }
            }
        }
    } catch {
        Write-Host "Could not read existing manifest, creating new one" -ForegroundColor Yellow
    }
}

# Write manifest
$manifestJson = $manifest | ConvertTo-Json -Depth 10
$manifestJson | Set-Content $ManifestPath -Encoding UTF8
Write-Host "Created/updated manifest: $ManifestPath" -ForegroundColor Green

# Register in Windows registry
$regPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"
try {
    New-Item -Path $regPath -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "(Default)" -Value $ManifestPath -Force
    Write-Host "Registered in Windows registry: $regPath" -ForegroundColor Green
    Write-Host "Registry points to: $ManifestPath" -ForegroundColor Green
} catch {
    Write-Error "Failed to register in registry: $_"
    exit 1
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Chrome completely (close all windows)" -ForegroundColor Yellow
Write-Host "2. Reload the extension in chrome://extensions/" -ForegroundColor Yellow
Write-Host "3. Open the extension dropdown to test the connection" -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify setup:" -ForegroundColor Cyan
Write-Host "  Get-ItemProperty -Path '$regPath' -Name '(Default)'" -ForegroundColor Gray


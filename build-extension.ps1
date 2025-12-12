# AMP Extension Build Script
# Creates ZIP and CRX files

$ErrorActionPreference = "Stop"
$ExtDir = Join-Path $PSScriptRoot "ext"
$Version = "4.0.2"
$ZipFile = Join-Path $PSScriptRoot "AMP-Extension-v$Version.zip"
$CrxFile = Join-Path $PSScriptRoot "AMP-Extension-v$Version.crx"
$PemFile = Join-Path $PSScriptRoot "privatekey.pem"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AMP Extension Build Script v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ext directory exists
if (-not (Test-Path $ExtDir)) {
    Write-Host "ERROR: Extension directory not found: $ExtDir" -ForegroundColor Red
    exit 1
}

# Remove old files if they exist
if (Test-Path $ZipFile) {
    Write-Host "Removing old ZIP file..." -ForegroundColor Yellow
    Remove-Item $ZipFile -Force
}
if (Test-Path $CrxFile) {
    Write-Host "Removing old CRX file..." -ForegroundColor Yellow
    Remove-Item $CrxFile -Force
}

# Create ZIP file
Write-Host "Creating ZIP file..." -ForegroundColor Green
try {
    Compress-Archive -Path "$ExtDir\*" -DestinationPath $ZipFile -Force
    $zipSize = [math]::Round((Get-Item $ZipFile).Length / 1KB, 2)
    Write-Host "✅ Created: $ZipFile ($zipSize KB)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create ZIP: $_" -ForegroundColor Red
    exit 1
}

# Create CRX file using Chrome
Write-Host ""
Write-Host "Creating CRX file..." -ForegroundColor Green

# Find Chrome executable
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromeExe = $path
        break
    }
}

if ($chromeExe -and (Test-Path $PemFile)) {
    Write-Host "Using Chrome at: $chromeExe" -ForegroundColor Gray
    Write-Host "Using key file: $PemFile" -ForegroundColor Gray
    
    try {
        # Chrome creates ext.crx in the parent directory of the extension
        $parentDir = Split-Path $ExtDir -Parent
        $tempCrx = Join-Path $parentDir "ext.crx"
        
        # Remove old temp CRX if exists
        if (Test-Path $tempCrx) {
            Remove-Item $tempCrx -Force
        }
        
        # Pack the extension
        $process = Start-Process -FilePath $chromeExe -ArgumentList "--pack-extension=`"$ExtDir`"", "--pack-extension-key=`"$PemFile`"" -Wait -PassThru -NoNewWindow
        
        # Wait for file to be created
        Start-Sleep -Seconds 2
        
        # Move the CRX file to final location
        if (Test-Path $tempCrx) {
            Move-Item $tempCrx $CrxFile -Force
            $crxSize = [math]::Round((Get-Item $CrxFile).Length / 1KB, 2)
            Write-Host "✅ Created: $CrxFile ($crxSize KB)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ CRX file was not created. Try packing manually in Chrome." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Failed to create CRX: $_" -ForegroundColor Yellow
        Write-Host "Try packing manually in Chrome (chrome://extensions/ -> Pack extension)" -ForegroundColor Gray
    }
} else {
    if (-not $chromeExe) {
        Write-Host "⚠️ Chrome not found. CRX not created." -ForegroundColor Yellow
    }
    if (-not (Test-Path $PemFile)) {
        Write-Host "⚠️ Private key not found at: $PemFile" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "To create CRX manually:" -ForegroundColor Yellow
    Write-Host "  1. Open Chrome -> chrome://extensions/" -ForegroundColor Gray
    Write-Host "  2. Enable 'Developer mode'" -ForegroundColor Gray
    Write-Host "  3. Click 'Pack extension'" -ForegroundColor Gray
    Write-Host "  4. Extension root: $ExtDir" -ForegroundColor Gray
    Write-Host "  5. Private key: $PemFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# List created files
Write-Host "Files:" -ForegroundColor White
if (Test-Path $ZipFile) {
    $zipSize = [math]::Round((Get-Item $ZipFile).Length / 1KB, 2)
    Write-Host "  ✅ $ZipFile ($zipSize KB)" -ForegroundColor Green
}
if (Test-Path $CrxFile) {
    $crxSize = [math]::Round((Get-Item $CrxFile).Length / 1KB, 2)
    Write-Host "  ✅ $CrxFile ($crxSize KB)" -ForegroundColor Green
}
Write-Host ""

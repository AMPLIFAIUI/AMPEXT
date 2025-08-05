# AMPiQ Manual Process Killer
# Run this script to manually terminate all AMP-related processes

Write-Host "AMPiQ Manual Cleanup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "Warning: Not running as administrator. Some processes may not be terminated." -ForegroundColor Yellow
    Write-Host "Consider running this script as administrator for complete cleanup." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Searching for AMP-related processes..." -ForegroundColor Yellow

# Find and kill AMPiQ processes
$ampiqProcesses = Get-Process -Name "AMPiQ" -ErrorAction SilentlyContinue
if ($ampiqProcesses) {
    Write-Host "Found $($ampiqProcesses.Count) AMPiQ process(es):" -ForegroundColor Yellow
    foreach ($proc in $ampiqProcesses) {
        Write-Host "  - PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor Gray
    }
    $ampiqProcesses | Stop-Process -Force
    Write-Host "✓ Killed AMPiQ processes" -ForegroundColor Green
} else {
    Write-Host "No AMPiQ processes found" -ForegroundColor Gray
}

# Find and kill Electron processes
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    Write-Host "Found $($electronProcesses.Count) Electron process(es):" -ForegroundColor Yellow
    foreach ($proc in $electronProcesses) {
        Write-Host "  - PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor Gray
    }
    $electronProcesses | Stop-Process -Force
    Write-Host "✓ Killed Electron processes" -ForegroundColor Green
} else {
    Write-Host "No Electron processes found" -ForegroundColor Gray
}

# Find and kill Node.js processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        Write-Host "  - PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor Gray
    }
    $nodeProcesses | Stop-Process -Force
    Write-Host "✓ Killed Node.js processes" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Waiting for processes to terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Force kill using taskkill as backup
Write-Host "Performing force cleanup..." -ForegroundColor Yellow

try {
    $result = & taskkill /f /im AMPiQ.exe 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Force killed AMPiQ.exe" -ForegroundColor Green
    }
} catch {
    Write-Host "No AMPiQ.exe processes to force kill" -ForegroundColor Gray
}

try {
    $result = & taskkill /f /im electron.exe 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Force killed electron.exe" -ForegroundColor Green
    }
} catch {
    Write-Host "No electron.exe processes to force kill" -ForegroundColor Gray
}

try {
    $result = & taskkill /f /im node.exe 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Force killed node.exe" -ForegroundColor Green
    }
} catch {
    Write-Host "No node.exe processes to force kill" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "All AMP-related processes have been terminated." -ForegroundColor Green

# Wait for user input before closing
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
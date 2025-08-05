# AMPiQ Cleanup Script
# This script terminates all AMP-related processes during uninstallation

Write-Host "AMPiQ Cleanup: Terminating all AMP processes..." -ForegroundColor Yellow

# Kill AMPiQ processes
try {
    Get-Process -Name "AMPiQ" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✓ Killed AMPiQ processes" -ForegroundColor Green
} catch {
    Write-Host "No AMPiQ processes found" -ForegroundColor Gray
}

# Kill Electron processes
try {
    Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✓ Killed Electron processes" -ForegroundColor Green
} catch {
    Write-Host "No Electron processes found" -ForegroundColor Gray
}

# Kill Node.js processes that might be related to AMP
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
    Write-Host "✓ Killed Node.js processes" -ForegroundColor Green
} catch {
    Write-Host "No Node.js processes found" -ForegroundColor Gray
}

# Wait a moment for processes to terminate
Start-Sleep -Seconds 2

# Force kill any remaining processes using taskkill
try {
    & taskkill /f /im AMPiQ.exe 2>$null
    & taskkill /f /im electron.exe 2>$null
    & taskkill /f /im node.exe 2>$null
    Write-Host "✓ Force cleanup completed" -ForegroundColor Green
} catch {
    Write-Host "Force cleanup completed" -ForegroundColor Gray
}

Write-Host "AMPiQ Cleanup: All processes terminated" -ForegroundColor Green
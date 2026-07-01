# =============================================================================
# PowerShell Script: Start Angular Dev Server with Port Cleanup
# Usage: .\start-dev-server.ps1
# =============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Switch-Monitoring Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill existing process on port 4200
Write-Host "[1/4] Checking for processes on port 4200..." -ForegroundColor Yellow
$portProcess = netstat -ano | findstr :4200 | findstr LISTENING
if ($portProcess) {
    $lines = $portProcess.Split("`n") | Where-Object { $_ -match '(\d+)' }
    foreach ($line in $lines) {
        if ($line -match '(\d+)\s*$') {
            $pid = [int]$matches[1]
            try {
                taskkill /PID $pid /F | Out-Null
                Write-Host "   ✓ Killed process PID $pid" -ForegroundColor Green
                Start-Sleep -Milliseconds 500
            }
            catch {
                Write-Host "   ⚠ Could not kill PID $pid: $_" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "   ✓ No process found on port 4200" -ForegroundColor Green
}

# Step 2: Clear Angular cache
Write-Host "[2/4] Clearing Angular cache..." -ForegroundColor Yellow
$cachePath = ".\.angular"
if (Test-Path $cachePath) {
    try {
        Remove-Item -Recurse -Force $cachePath -ErrorAction SilentlyContinue
        Write-Host "   ✓ Cache cleared" -ForegroundColor Green
    }
    catch {
        Write-Host "   ⚠ Could not clear cache (folder in use)" -ForegroundColor Yellow
    }
}

# Step 3: Wait for port to be free
Write-Host "[3/4] Waiting for port 4200 to be available..." -ForegroundColor Yellow
$timeout = 0
while ($timeout -lt 10) {
    $portCheck = netstat -ano 2>$null | findstr :4200 | findstr LISTENING
    if (-not $portCheck) {
        Write-Host "   ✓ Port 4200 is now available" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $timeout++
}

# Step 4: Start the server
Write-Host "[4/4] Starting Angular dev server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Server starting on http://localhost:4200/" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start ng serve with polling enabled for better file watching
ng serve --port 4200 --poll 1000

# If ng serve fails, show error
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start server. Exit code: $LASTEXITCODE" -ForegroundColor Red
    pause
}

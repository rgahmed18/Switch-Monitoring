@echo off
REM =============================================================================
REM Batch Script: Start Angular Dev Server with Port Cleanup
REM Usage: start-dev-server.bat
REM =============================================================================

color 3F
cls
echo.
echo ================================================================================
echo   Switch-Monitoring Frontend Server - Startup Script
echo ================================================================================
echo.

REM Step 1: Kill existing process on port 4200
echo [1/4] Checking for processes on port 4200...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200 ^| findstr LISTENING') do (
    echo   - Found process PID %%a, terminating...
    taskkill /PID %%a /F 2>nul
    if errorlevel 0 (
        echo   ✓ Process %%a terminated
        timeout /t 1 /nobreak >nul
    )
)

REM Step 2: Clear Angular cache
echo [2/4] Clearing Angular cache...
if exist ".angular" (
    rmdir /s /q ".angular" 2>nul
    if not exist ".angular" (
        echo   ✓ Cache cleared
    ) else (
        echo   ⚠ Cache folder still in use (will be cleaned on next run)
    )
) else (
    echo   ✓ No cache found
)

REM Step 3: Wait for port to be free
echo [3/4] Waiting for port 4200 to be available...
set timeout=0
:wait_loop
netstat -ano | findstr :4200 | findstr LISTENING >nul
if "%errorlevel%"=="1" (
    echo   ✓ Port 4200 is now available
    goto :start_server
)
if "%timeout%"=="10" (
    echo   ⚠ Port still in use, attempting to start anyway...
    goto :start_server
)
timeout /t 1 /nobreak >nul
set /a timeout=%timeout%+1
goto :wait_loop

:start_server
REM Step 4: Start the server
echo [4/4] Starting Angular dev server...
echo.
echo ================================================================================
echo   ✓ Server starting http://localhost:4200/
echo   ✓ Press Ctrl+C to stop
echo ================================================================================
echo.

ng serve --port 4200 --poll 1000

if errorlevel 1 (
    color 4F
    echo.
    echo ERROR: Failed to start server!
    echo.
    pause
)

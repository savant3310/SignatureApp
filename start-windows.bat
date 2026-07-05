@echo off
REM Animated Signature Studio - Windows launcher
cd /d "%~dp0"
echo.
echo   Animated Signature Studio
echo   Starting local server...
echo.
start "Signature Studio Server" cmd /k "python -m http.server 8000 2>nul || py -m http.server 8000"

set tries=0
:wait
set /a tries+=1
curl -s -o nul http://localhost:8000/ 2>nul
if not errorlevel 1 goto ready
if %tries% GEQ 15 goto timedout
timeout /t 1 /nobreak >nul
goto wait

:ready
echo   Opening http://localhost:8000
start "" http://localhost:8000
echo   Leave the "Signature Studio Server" window open while using the app.
pause
goto :eof

:timedout
echo   Could not reach http://localhost:8000 after 15s.
echo   Check the "Signature Studio Server" window for errors (is Python installed?).
pause

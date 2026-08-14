@echo off
REM ===========================================================================
REM  IntelliLab Society — start a local web server
REM ---------------------------------------------------------------------------
REM  Cookies do NOT work when you open index.html directly (file:// paths are
REM  treated as unique security origins by the browser). Run this file instead:
REM  it serves the folder over http://localhost:8000 where cookies work
REM  normally.
REM
REM  Double-click this file, then open http://localhost:8000 in your browser.
REM  Press Ctrl+C in the black window to stop the server.
REM ===========================================================================

cd /d "%~dp0"

echo.
echo  IntelliLab Society - local web server
echo  =====================================
echo.
echo  Serving this folder at:  http://localhost:8000
echo  Press Ctrl+C to stop.
echo.

start "" http://localhost:8000

python -m http.server 8000 2>nul
if errorlevel 1 (
  echo.
  echo  Python was not found. Trying Node instead...
  npx --yes serve -l 8000
)

pause

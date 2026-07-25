@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo NABD AL-GHARB DESKTOP FINAL WINDOWS BUILD 1.7.2
echo ==============================================

where node >nul 2>nul || (
  echo ERROR: Node.js is not installed.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

where cargo >nul 2>nul || (
  echo ERROR: Rust is not installed.
  echo Install Rust from https://rustup.rs and restart Windows.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing Node packages...
  call npm install --no-audit --no-fund || goto :fail
)

echo Running source checks...
python RUN_FINAL_CHECKS.py || goto :fail

echo Building Windows installer...
call npm run tauri build || goto :fail

echo.
echo BUILD COMPLETE
 echo Installers are normally created inside:
 echo src-tauri\target\release\bundle\nsis
 echo src-tauri\target\release\bundle\msi
pause
exit /b 0

:fail
echo.
echo BUILD FAILED. Read the error shown above.
pause
exit /b 1

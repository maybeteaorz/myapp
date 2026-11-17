@echo off
cd /d "%~dp0"
title My Work Life Desk

where node >nul 2>nul
if %errorlevel%==0 goto run

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\nodejs\node.exe" goto run

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" goto run

for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do if exist "%%D\node.exe" set "PATH=%%D;%PATH%"
where node >nul 2>nul
if %errorlevel%==0 goto run

echo.
echo  [!] Node.js was not found on this computer.
echo      Install it from https://nodejs.org/ then double-click this file again.
echo.
pause
exit /b 1

:run
node server.js
echo.
echo  Server stopped. Data is already saved on disk.
pause

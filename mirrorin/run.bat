@echo off
REM mirrorin - launcher (tanpa console di layar)
cd /d "%~dp0"
start "" /min "%LOCALAPPDATA%\Programs\Python\Python313\pythonw.exe" "%~dp0main.py"
exit
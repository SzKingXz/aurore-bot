@echo off
cd /d "%~dp0"

echo Haciendo push de cambios...
git add .
git commit -m "Fix: usar sqlite3 compatible con Render"
git push origin main

if errorlevel 1 (
    echo ERROR en push
    pause
    exit /b 1
)

echo EXITO! Los cambios se subieron a GitHub
echo Render deberia hacer un nuevo deploy automaticamente
pause

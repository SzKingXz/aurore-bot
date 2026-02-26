@echo off
cd /d "%~dp0"

echo.
echo AURORE BOT - Deployment a GitHub
echo.

git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git no esta instalado
    pause
    exit /b 1
)

echo Git OK
echo.

set /p USER="Tu usuario GitHub: "

if "!USER!"=="" (
    echo Necesitas ingresar un usuario
    pause
    exit /b 1
)

set /p EMAIL="Tu email GitHub: "

if "!EMAIL!"=="" (
    echo Necesitas ingresar un email
    pause
    exit /b 1
)

echo.
echo Usuario: !USER!
echo Email: !EMAIL!
echo.

echo Configurando Git...
git config user.name "!USER!"
git config user.email "!EMAIL!"

echo Limpiando remotes...
git remote remove origin >nul 2>&1

echo Agregando URL...
git remote add origin https://github.com/!USER!/aurore-bot.git

echo.
echo Agregando archivos...
git add .

echo Haciendo commit...
git commit -m "Initial commit: AURORE Bot v4.0.0" >nul 2>&1

echo.
echo Haciendo push a GitHub...
echo (Puede pedir autenticacion)
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR en push
    pause
    exit /b 1
)

echo.
echo EXITO!
echo.
pause

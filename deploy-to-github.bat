@echo off
cd /d "%~dp0"

echo.
echo Verificando Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo Git NO esta instalado
    echo Descargalo desde: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Git OK
echo.

set /p GitHubUser="Tu usuario de GitHub: "
set /p GitHubEmail="Tu email de GitHub: "

if "!GitHubUser!"=="" (
    echo Usuario vacio
    pause
    exit /b 1
)

set RepoUrl=https://github.com/!GitHubUser!/aurore-bot.git

echo.
echo Iniciando deployment...
echo.

git init
git config user.name "!GitHubUser!"
git config user.email "!GitHubEmail!"
git remote add origin !RepoUrl! 2>nul
git branch -M main
git add .
git commit -m "Initial commit: AURORE Bot v4.0.0"
git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR en el push
    echo Verifica que el repositorio aurore-bot existe en GitHub
    pause
    exit /b 1
)

echo.
echo EXITO! Bot en: !RepoUrl!
echo.
pause

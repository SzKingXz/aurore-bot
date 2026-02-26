@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo =====================================
echo  AURORE BOT - DEPLOYMENT A GITHUB
echo =====================================
echo.

git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git NO esta instalado
    pause
    exit /b 1
)

echo [OK] Git instalado
echo.

set /p GitHubUser="Tu usuario GitHub (ejemplo: SzKingXz): "

if "!GitHubUser!"=="" (
    echo ERROR: Usuario vacio
    pause
    exit /b 1
)

set /p GitHubEmail="Tu email GitHub (ejemplo: tu@email.com): "

if "!GitHubEmail!"=="" (
    echo ERROR: Email vacio
    pause
    exit /b 1
)

echo.
echo [OK] Configuracion:
echo     Usuario: !GitHubUser!
echo     Email: !GitHubEmail!
echo.

set RepoUrl=https://github.com/!GitHubUser!/aurore-bot.git

echo [1/5] Inicializando Git...
git init
if errorlevel 1 goto error

echo [2/5] Configurando usuario...
git config user.name "!GitHubUser!"
git config user.email "!GitHubEmail!"

echo [3/5] Agregando remote...
git remote remove origin 2>nul
git remote add origin !RepoUrl!

echo [4/5] Agregando archivos...
git add .

echo [5/5] Haciendo commit y push...
git commit -m "Initial commit: AURORE Bot v4.0.0 - Modular Architecture"
if errorlevel 1 (
    echo [SKIP] Commit (ya existe o sin cambios)
)

echo.
echo Haciendo push a GitHub...
echo (Puede pedir autenticacion)
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR en push
    echo Posibles causas:
    echo - Credenciales de GitHub incorrectas
    echo - No tienes permiso en el repo
    echo - Problema de conexion
    pause
    exit /b 1
)

echo.
echo =====================================
echo  EXITO!
echo =====================================
echo.
echo Tu repositorio esta en:
echo !RepoUrl!
echo.
echo Siguiente: Configura en render.com
echo.
pause

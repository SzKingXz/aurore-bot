@echo off
chcp 65001 > nul
echo.
echo [AURORE] Push a producción
echo ================================

cd /d "C:\Users\Administrator\Documents\Aurore System\Discord"
echo.
echo [BOT] Commiteando cambios...
git add -A
git commit -m "deploy: %DATE% %TIME%" 2>nul || echo (sin cambios en bot)
git push origin main
if %errorlevel% neq 0 (
  echo [ERROR] Push del bot fallido
  pause
  exit /b 1
)
echo [BOT] Push OK

cd /d "C:\Users\Administrator\Documents\Aurore System\frontend"
echo.
echo [FRONTEND] Commiteando cambios...
git add -A
git commit -m "deploy: %DATE% %TIME%" 2>nul || echo (sin cambios en frontend)
git push origin main
if %errorlevel% neq 0 (
  echo [ERROR] Push del frontend fallido
  pause
  exit /b 1
)
echo [FRONTEND] Push OK

echo.
echo ================================
echo [AURORE] Deploy completado
echo   Bot     → Render (auto-deploy)
echo   Frontend → Vercel (auto-deploy)
echo ================================
echo.
pause

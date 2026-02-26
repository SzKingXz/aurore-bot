param(
    [string]$GitHubUser = "",
    [string]$GitHubEmail = "",
    [string]$RepoName = "aurore-bot"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 AURORE BOT — SCRIPT AUTOMÁTICO DE DEPLOYMENT     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $GitHubUser) {
    $GitHubUser = Read-Host "Ingresa tu usuario de GitHub"
}
if (-not $GitHubEmail) {
    $GitHubEmail = Read-Host "Ingresa tu email de GitHub"
}

$RepoUrl = "https://github.com/$GitHubUser/$RepoName.git"

Write-Host "📋 Configuración:" -ForegroundColor Yellow
Write-Host "  Usuario GitHub: $GitHubUser"
Write-Host "  Email: $GitHubEmail"
Write-Host "  Repositorio: $RepoUrl"
Write-Host ""

Write-Host "⏳ Verificando si Git está instalado..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git NO está instalado." -ForegroundColor Red
    Write-Host "   Descargarlo desde: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "1️⃣  Inicializando repositorio local..." -ForegroundColor Cyan

git init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en 'git init'" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Repositorio inicializado" -ForegroundColor Green

Write-Host ""
Write-Host "2️⃣  Configurando Git..." -ForegroundColor Cyan

git config user.name $GitHubUser
git config user.email $GitHubEmail
git remote add origin $RepoUrl 2>$null
git branch -M main

Write-Host "✅ Git configurado" -ForegroundColor Green

Write-Host ""
Write-Host "3️⃣  Agregando archivos..." -ForegroundColor Cyan

git add .
Write-Host "✅ Archivos listos para commit" -ForegroundColor Green

Write-Host ""
Write-Host "4️⃣  Creando commit..." -ForegroundColor Cyan

git commit -m "Initial commit: AURORE Bot v4.0.0 - Modular Architecture"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en commit" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Commit creado" -ForegroundColor Green

Write-Host ""
Write-Host "5️⃣  Haciendo push a GitHub..." -ForegroundColor Cyan
Write-Host "    (Puede pedir autenticación de GitHub)" -ForegroundColor Yellow
Write-Host ""

git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en push. Verifica:" -ForegroundColor Red
    Write-Host "   - Repositorio existe en GitHub" -ForegroundColor Yellow
    Write-Host "   - Credenciales de GitHub son correctas" -ForegroundColor Yellow
    Write-Host "   - Token/SSH está configurado" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ DEPLOYMENT A GITHUB COMPLETADO                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Tu repositorio está en:" -ForegroundColor Green
Write-Host "   $RepoUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Próximo paso:" -ForegroundColor Yellow
Write-Host "   1. Ve a https://render.com" -ForegroundColor White
Write-Host "   2. Conecta tu GitHub" -ForegroundColor White
Write-Host "   3. Crea Web Service desde el repo" -ForegroundColor White
Write-Host "   4. Agrega variables de entorno" -ForegroundColor White
Write-Host ""
Write-Host "📖 Lee: DEPLOYMENT_RENDER.md para más detalles" -ForegroundColor Yellow

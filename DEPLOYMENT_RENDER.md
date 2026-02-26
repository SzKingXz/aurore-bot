╔════════════════════════════════════════════════════════════════════╗
║         AURORE BOT — GUÍA DE DEPLOYMENT EN RENDER.COM             ║
╚════════════════════════════════════════════════════════════════════╝

📅 Última actualización: 25 Febrero 2026
🎯 Objetivo: Poner el bot en producción (online 24/7)

══════════════════════════════════════════════════════════════════════
1️⃣  PREPARACIÓN INICIAL (5 minutos)
══════════════════════════════════════════════════════════════════════

✅ Requisitos:
  - Cuenta en Render.com (gratuita)
  - Repositorio en GitHub con el código
  - Credenciales de Discord (ya tienes)

📝 Pasos:

1. Crear repositorio en GitHub:
   - Ir a https://github.com/new
   - Nombre: aurore-bot
   - Descripción: AURORE Discord Bot - Modular Architecture
   - Público (recomendado)
   - Crear

2. Clonar repositorio:
   git clone https://github.com/tu-usuario/aurore-bot.git
   cd aurore-bot

3. Copiar archivos:
   - Copiar todo de: C:\Users\Administrator\Documents\Aurore System\Discord\
   - Al repositorio local
   - EXCEPTO: node_modules/, .env, aurore.db*

4. Crear .gitignore:
   ────────────────────
   node_modules/
   .env
   .env.local
   *.db
   *.db-shm
   *.db-wal
   .DS_Store
   ────────────────────

5. Commit y push:
   git add .
   git commit -m "Initial commit: AURORE Bot v4.0.0"
   git push origin main

══════════════════════════════════════════════════════════════════════
2️⃣  CONFIGURAR EN RENDER.COM (10 minutos)
══════════════════════════════════════════════════════════════════════

📋 Pasos:

1. Ir a https://dashboard.render.com

2. Crear nuevo servicio web:
   - Click en "New +" → "Web Service"
   - Conectar con GitHub (si no está conectado)
   - Seleccionar repositorio: aurore-bot
   - Click "Connect"

3. Configurar el servicio:
   ────────────────────────────
   Name:               aurore-bot
   Environment:        Node
   Build Command:      npm install
   Start Command:      npm start
   Plan:               Free (o Starter si necesitas más)
   ────────────────────────────

4. Variables de entorno (CRÍTICO):
   Click en "Environment" y agregar:
   ────────────────────────────
   TOKEN                    → MTQ2NDMxODQz... (bot token)
   CLIENT_ID               → 1464318434849591336
   CLIENT_SECRET           → bonV5pfEZwkAaTk3Jag5Yh0LKziy2XrK
   JWT_SECRET              → 16145865915dbfa5c01139acc72d41e302c0b48abbddfc7c94750e7845517263
   PORT                    → 3001
   NODE_ENV                → production
   ALLOWED_ORIGINS         → https://aurore-dashboard.vercel.app
   ────────────────────────────

5. Crear servicio:
   - Click en "Create Web Service"
   - Esperar a que compile (2-3 minutos)
   - Ver logs en tiempo real

══════════════════════════════════════════════════════════════════════
3️⃣  VERIFICAR QUE FUNCIONA (5 minutos)
══════════════════════════════════════════════════════════════════════

✅ Señales de éxito en logs:
   - "✅ AURORE online — AURØRE#0298"
   - "✅ 5 eventos cargados"
   - "✅ 34 comandos registrados"
   - "🌐 API en puerto 3001"

❌ Si hay errores:
   - Verificar variables de entorno
   - Verificar que token es válido
   - Revisar logs de Render

🧪 Probar en Discord:
   - Ir a tu servidor de prueba
   - Escribir: /help
   - Debería responder sin "El bot no respondió"

══════════════════════════════════════════════════════════════════════
4️⃣  ACTUALIZAR DISCORD BOT SETTINGS
══════════════════════════════════════════════════════════════════════

Una vez desplegado en Render, actualizar en Discord Developer Portal:

1. Ir a https://discord.com/developers/applications/1464318434849591336

2. En "OAuth2" → "Redirects":
   Agregar: https://aurore-bot.onrender.com/callback

3. En "General Information":
   Verificar que token y client ID sean correctos

4. En "Bot":
   - "Public Bot" → Habilitado (si quieres que otros lo agreguen)
   - "Require OAuth2 Code Grant" → Deshabilitado

══════════════════════════════════════════════════════════════════════
5️⃣  URL DEL BOT EN PRODUCCIÓN
══════════════════════════════════════════════════════════════════════

Una vez desplegado, tu bot estará en:

🔗 https://aurore-bot.onrender.com

Endpoints disponibles:
  - GET  /api/stats → Estadísticas globales del bot
  - POST /api/command → (futuro) Ejecutar comandos vía API

API estará disponible 24/7 (con plan Free tiene algunos límites).

══════════════════════════════════════════════════════════════════════
6️⃣  MONITOREO EN PRODUCCIÓN
══════════════════════════════════════════════════════════════════════

Render proporciona:
  ✅ Logs en tiempo real
  ✅ Métricas de CPU y memoria
  ✅ Alertas de caídas
  ✅ Auto-restart si falla

Panel: https://dashboard.render.com/services

══════════════════════════════════════════════════════════════════════
7️⃣  ACTUALIZAR CÓDIGO (Después)
══════════════════════════════════════════════════════════════════════

Para actualizar el bot en producción:

1. Hacer cambios locales
2. Commit y push a GitHub:
   git add .
   git commit -m "Mejora: agregar comando X"
   git push origin main

3. Render automáticamente:
   - Detecta el push
   - Reconstruye
   - Despliega la nueva versión
   - Sin tiempo de inactividad

══════════════════════════════════════════════════════════════════════
⚠️  NOTAS IMPORTANTES
══════════════════════════════════════════════════════════════════════

1. Plan FREE de Render:
   - Spins down después de 15 min de inactividad
   - Se reinicia al recibir requests
   - Perfecto para bots (siempre hay actividad)

2. Base de datos SQLite:
   - IMPORTANTE: En Render, SQLite en /tmp es temporal
   - Para producción, agregar PostgreSQL (recomendado)
   - O cambiar a MongoDB

3. Seguridad:
   - NUNCA agregar .env a GitHub
   - NUNCA compartir variables de entorno
   - NUNCA exponer TOKEN en código

4. Backups:
   - Render no mantiene backups automáticos
   - Guardar backups de base de datos regularmente

══════════════════════════════════════════════════════════════════════
🎯 CHECKLIST FINAL
══════════════════════════════════════════════════════════════════════

☐ Repositorio en GitHub creado
☐ Código pusheado con .gitignore correcto
☐ Servicio web creado en Render
☐ Variables de entorno configuradas
☐ Deploy completado exitosamente
☐ Logs muestran "AURORE online"
☐ Bot responde a comandos en Discord
☐ Verificar /api/stats funciona

═══════════════════════════════════════════════════════════════════════

Una vez completado este proceso, tu AURORE BOT estará:
  ✅ Online 24/7
  ✅ Accesible desde Discord sin "El bot no respondió"
  ✅ Escalable y mantenible
  ✅ Listo para agregar más features

¿Necesitas ayuda con algún paso?

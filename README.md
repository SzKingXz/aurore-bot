# 🎮 AURORE BOT

**Discord Bot - Modular Architecture | XP System | Moderation | Autoroles**

```
✅ Bot Online: AURØRE#0298
✅ Commands: 34 funcionando
✅ Architecture: Modular & Professional
```

---

## 🚀 Deployment Rápido (3 pasos)

### 1. Instala Git
Descargar desde: https://git-scm.com/download/win

### 2. Ejecuta el script de deployment
```powershell
cd "C:\Users\Administrator\Documents\Aurore System\Discord"
.\deploy-to-github.ps1
```
Ingresa usuario y email de GitHub cuando pida.

### 3. Configura en Render.com
- Conecta GitHub
- Crea Web Service desde repo `aurore-bot`
- Agrega variables de entorno (TOKEN, CLIENT_ID, etc.)
- Deploy automático

---

## 📁 Estructura del Proyecto

```
Discord/
├── bot.js              (69 líneas - punto de entrada)
├── db.js               (Base de datos SQLite)
├── package.json
├── .env                (Variables de entorno - no en Git)
│
├── utils/              (5 módulos reutilizables)
│   ├── constants.js
│   ├── helpers.js
│   ├── modLog.js
│   ├── commandLoader.js
│   └── eventLoader.js
│
├── events/             (Manejadores de eventos)
│   ├── ready.js
│   ├── messageCreate.js
│   ├── guildMemberAdd.js
│   ├── interactionCreate.js
│   ├── loops.js
│   └── handlers/
│       ├── buttons.js
│       └── selectMenu.js
│
├── commands/           (34 comandos en 10 categorías)
│   ├── general/
│   ├── profile/
│   ├── info/
│   ├── utilities/
│   ├── fun/
│   ├── giveaway/
│   ├── suggestions/
│   ├── autoroles/
│   ├── moderation/
│   └── config/
│
├── deploy-to-github.ps1    (Script automático)
├── DEPLOYMENT_RENDER.md    (Guía completa)
├── LISTO_PARA_DEPLOYMENT.txt
└── render.yaml
```

---

## 💻 Desarrollo Local

```bash
npm install    # Si no están instaladas las dependencias
npm start      # Inicia el bot
```

Bot escuchará en `http://localhost:3001`

---

## 🔑 Variables de Entorno

Crear archivo `.env` con:

```
TOKEN=tu_token_de_bot
CLIENT_ID=1464318434849591336
CLIENT_SECRET=bonV5pfEZwkAaTk3Jag5Yh0LKziy2XrK
JWT_SECRET=16145865915dbfa5c01139acc72d41e302c0b48abbddfc7c94750e7845517263
PORT=3001
ALLOWED_ORIGINS=https://aurore-dashboard.vercel.app
```

---

## ✨ Características

- **34 Comandos** en 10 categorías
- **XP System** con niveles automáticos
- **Moderation** completa con logs persistentes
- **Autoroles** (colores y regiones)
- **Sorteos** automáticos
- **Anti-spam** integrado
- **API REST** para stats
- **Arquitectura Modular** - Escalable y mantenible

---

## 🛠️ Tech Stack

- **discord.js** 14.14.1
- **Node.js** 20+
- **SQLite** (mejor-sqlite3)
- **Express** (API)
- **Render** (Hosting)
- **Vercel** (Dashboard)

---

## 📝 Documentación

- **DEPLOYMENT_RENDER.md** - Guía completa de deployment
- **LISTO_PARA_DEPLOYMENT.txt** - Pasos exactos
- **render.yaml** - Configuración Render

---

## 🤝 Contribuir

Para agregar nuevos comandos:

1. Crear archivo en `commands/categoria/comando.js`
2. Seguir estructura estándar de SlashCommand
3. El bot auto-cargará el comando

---

## 📈 Roadmap

- [ ] PostgreSQL (reemplazar SQLite)
- [ ] Dashboard mejorado
- [ ] Integración con otras APIs
- [ ] Sistema de tickets
- [ ] Logs en línea

---

**¿Preguntas?** Revisar documentación en carpeta `Discord/`

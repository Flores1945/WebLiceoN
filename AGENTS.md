# I.E. Liceo Trujillo — Ecosistema de Asistencia

## Arquitectura actual

```
App Android (Kotlin, C:\Users\flore\AndroidStudioProjects\ApkAsistencia)
Web (paginas/, estilos/, scripts/ — servida por el mismo Express)
        │  HTTP LAN (http://IP-PC:3000)
        ▼
Backend Node.js/Express (backend/src/)  ──PM2──►  puerto 3000
        │  DATABASE_URL
        ▼
Supabase PostgreSQL (pqdtgeeumqrqjhgsmlar, pooler aws-1-us-west-2:5432)
        │
        ├──► wa-rapido (puerto 3001, Baileys/WhatsApp Web del 941 849 556)
        │      POST /send {number, text} · GET /status · sesión en wa-rapido/sesion/
        │
        └──► n8n local (localhost:5678) — webhook asistencia + IA WhatsApp (futuro: webhook entrante)
```

## Procesos (PM2 los mantiene vivos y auto-arrancan en Windows)

```powershell
pm2 status / pm2 logs / pm2 restart all
# Config: ecosystem.config.js (raíz del proyecto)
# wa-rapido/sesion/ = llaves de WhatsApp — NUNCA commitear (ya está en .gitignore)
```

## Reglas de seguridad (OBLIGATORIAS en todo cambio)

1. **Cero secretos en el código** — todo por `process.env` / `.env` (ignorado por git)
2. **`wa-rapido/sesion/` jamás al repo** — son las llaves de la cuenta de WhatsApp
3. **Endpoints públicos siempre con `x-n8n-key`** (`N8N_API_KEY`) — `/api/public/asistencia`, `/api/public/justificacion` ya lo tienen; `/api/public/reglamento` es solo lectura
4. **`/api/apk/*` requiere JWT** — no abrir rutas de la app sin `autenticar`
5. **Contraseñas siempre bcrypt** — nunca texto plano ni hash propio
6. **Datos dinámicos, nunca hardcodeados** — teléfonos siempre del registro del alumno/apoderado
7. **Validar y normalizar entradas** — emails, teléfonos (`51`+9 dígitos PE), estados de asistencia
8. **Errores de red/WhatsApp nunca bloquean el guardado** — notificaciones son fire-and-forget con try/catch
9. **No commitear**: `.env`, `sesion/`, `node_modules/`, `*.log`, `firebase-key.json`, `_*.png/js/html` temporales
10. **Credenciales rotadas**: DATABASE_URL, JWT_SECRET y N8N_API_KEY fueron expuestos en chat — rotar antes de producción

## Comandos

```powershell
# Desarrollo local
cd backend ; npm start          # o: pm2 restart liceo-backend
cd wa-rapido ; npm start        # o ya corre vía PM2

# App Android
cd C:\Users\flore\AndroidStudioProjects\ApkAsistencia
.\gradlew assembleDebug
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

## Notas

- La IP del backend cambia por red → `Config.BASE_URL` en `Api.kt` de la app
- QR del alumno = JSON {id, dni, nombres, apellidos, nivel, grado, seccion, turno}
- Asistencia por aula: POST /api/apk/asistencias/aula {nivel, grado, seccion, estado}
- PDFs de QR se generan en el navegador (jsPDF + qrcode.min.js), sin backend

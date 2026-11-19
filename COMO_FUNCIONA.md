# Sistema de Asistencia — I.E. Emblemática Liceo Trujillo

## ¿Cómo funciona todo? (Resumen para presentación)

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  APP ANDROID    │         │  PÁGINA WEB      │         │  BASE DE DATOS  │
│  (docentes)     │         │  (directivos)    │         │  (Supabase)     │
│                 │         │                  │         │                 │
│ · Login         │────────►│ · Registro de    │────────►│ · Alumnos       │
│ · Lista alumnos │  mismo  │   alumnos y      │         │ · Asistencias   │
│ · Lector QR     │ servidor│   apoderados     │         │ · Usuarios      │
│ · Marcar        │         │ · Marcar         │         │ · Justificaciones│
│   asistencia    │         │   asistencia     │         │ · Reglamento    │
│ · Asistencia    │         │ · Marcar aula    │         └────────┬────────┘
│   rápida (aula) │         │   completa       │                  │
└─────────────────┘         │ · Generar PDF/   │                  │
                            │   Excel de QRs   │                  │
                            └──────────────────┘                  │
                                        │                         │
                                        ▼                         ▼
                              ┌──────────────────┐      ┌─────────────────┐
                              │  WHATSAPP        │      │  n8n + IA       │
                              │  (número del     │      │  (justificaciones│
                              │  colegio)        │      │  de padres)     │
                              └──────────────────┘      └─────────────────┘
```

## Los 4 componentes

### 1. App Android (solo para docentes)
- Login con el mismo usuario/clave creado en la web
- Lista los ~660 alumnos con buscador por nombre o DNI
- **Escáner QR**: apunta al QR del alumno (impreso desde la web) y marca su asistencia
- **Asistencia rápida**: filtra por nivel (Primaria/Secundaria), grado y sección → un botón marca a toda el aula
- Estados: Presente / Ausente / Tarde / Justificado — con colores
- Diseño institucional: escudo del Liceo, azul y blanco

### 2. Página web (directivos y docentes)
- **Registro de alumnos**: datos personales + apoderado (nombre, parentesco y **celular** — aquí nace la notificación)
- **Marcar asistencia**: individual, por alumno o por aula completa
- **Generador de PDF de QRs**: por aula (30 QRs por hoja, caben en 1 página) o todos los alumnos en un solo PDF — para imprimir y pegar en el cuaderno del alumno
- **Exportar Excel**: lista completa de alumnos con formato profesional, ordenada por aula, con resumen por sexo
- **Justificaciones y reglamento**: el agente IA responde consultas de padres sobre normas del colegio

### 3. Base de datos (Supabase — PostgreSQL en la nube)
- Almacena alumnos, apoderados, asistencias diarias, usuarios y reglamento
- Es lo único que está "en internet"; todo lo demás corre en la computadora del colegio

### 4. Notificaciones WhatsApp (el diferencial del sistema)
- Cuando se marca una asistencia, el sistema toma **automáticamente el celular del apoderado registrado** y envía un WhatsApp desde el **número oficial del colegio (941 849 556)**
- Mensajes según estado: "Puntual", "Tardanza", "Falta" (con aviso de que puede justificar respondiendo)
- Si el puente está apagado, la asistencia **se guarda igual** — nunca se pierde el registro
- Futuro: las respuestas de los padres serán atendidas por un agente IA en n8n que valida justificaciones contra el reglamento escolar

## Medidas de seguridad implementadas

| Medida | Detalle |
|---|---|
| **Autenticación** | Login con usuario/clave; las claves se guardan con BCrypt (encriptadas, nunca en texto plano) |
| **Tokens JWT** | La app y la web usan tokens que expiran a las 12 horas; nadie puede entrar sin credenciales válidas |
| **Control de intentos** | Máximo 10 intentos de login fallidos por usuario cada 15 minutos (anti-fuerza-bruta) |
| **Roles y permisos** | Director, Subdirector, Docente, etc. — cada uno solo puede hacer lo que su cargo permite |
| **Endpoints protegidos** | Las rutas de la app exigen token; los endpoints públicos exigen clave compartida (`x-n8n-key`) |
| **Secretos fuera del código** | Contraseñas de base de datos, claves JWT y tokens viven en `.env`, que está excluido de Git — nunca se suben al repositorio |
| **Sesión de WhatsApp protegida** | Las llaves de la sesión del número del colegio están en carpeta ignorada por Git |
| **Validación de datos** | Teléfonos normalizados a formato peruano (51 + 9 dígitos), estados de asistencia validados, DNI de 7 dígitos |
| **Resiliencia** | PM2 mantiene backend y WhatsApp vivos 24/7 con reinicio automático; los envíos de WhatsApp nunca bloquean el guardado de asistencias |
| **Auditoría** | Los cambios importantes (crear/editar/eliminar) quedan registrados |

## ¿Qué NO tiene (honestidad técnica)?

- No usa la API oficial de Meta/WhatsApp — usa un puente local (Baileys). Funciona, pero WhatsApp podría pedir re-vincular el dispositivo ocasionalmente
- Las respuestas automáticas de padres por WhatsApp (IA) están preparadas pero pendientes de conectar el webhook de entrada en n8n
- Todo corre en la computadora del colegio: si está apagada, el sistema no responde (los datos sí están seguros en Supabase)

---
*I.E. Emblemática Liceo Trujillo — Sistema de Asistencia Escolar*

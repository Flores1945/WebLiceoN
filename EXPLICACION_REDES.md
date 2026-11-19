# Publicar una aplicación web SOLO dentro de una red WiFi (ejemplo: red "VRC" del colegio)

Guía paso a paso para que una página/app solo sea accesible desde los dispositivos
conectados a una red WiFi específica, usando direcciones IP privadas.

---

## 1. El concepto clave: IPs privadas

Cada dispositivo en una red WiFi recibe una **dirección IP privada** (no visible desde internet).
Los rangos privados más usados son:

| Notación CIDR | Rango                    | Uso típico              |
|---------------|--------------------------|-------------------------|
| 192.168.0.0/16 | 192.168.0.0 – 192.168.255.255 | Colegios, oficinas    |
| 10.0.0.0/8     | 10.0.0.0 – 10.255.255.255    | Redes grandes         |
| 172.16.0.0/12  | 172.16.0.0 – 172.31.255.255  | Empresas medianas     |

El número después del `/` indica cuántos bits de red hay:
- `/24` → una sola subred de 254 dispositivos (ej: 192.168.100.0/24)
- `/16` → red grande de ~65,000 dispositivos (ej: 192.168.0.0/16)

**Idea central:** si la página vive en `192.168.100.8`, esa IP **solo existe dentro de esa red**.
Quien esté en otra red (casa, datos móviles, otra sede) no puede ni encontrarla.

---

## 2. Paso a paso (caso real: servidor en la PC del colegio)

### Paso 1 — Servidor encendido y conectado al WiFi "VRC"

- La PC que corre la aplicación (backend Node.js) debe estar conectada al WiFi del colegio.
- Verificar su IP:

```powershell
ipconfig
# Buscar "Dirección IPv4" en el adaptador WiFi → ej: 192.168.100.8
```

### Paso 2 — El servidor escucha en el puerto correcto

- La app web/API corre en el puerto `3000` (o el que corresponda).
- Debe escuchar en `0.0.0.0` (todas las interfaces), NO solo en `localhost`,
  para que otros dispositivos de la red puedan entrar.

```js
// En Node.js / Express:
app.listen(3000, "0.0.0.0", () => console.log("Servidor en red local"));
```

### Paso 3 — Los clientes se conectan al mismo WiFi

- Celulares/tablets de docentes se conectan al WiFi **VRC** (o el nombre del colegio).
- Cada uno recibe una IP del mismo rango (ej: 192.168.100.15, .16, .17...).
- En el navegador o app escriben: `http://192.168.100.8:3000`

### Paso 4 — (Opcional pero recomendado) Fijar la IP del servidor

Las IPs dinámicas (DHCP) pueden cambiar al reiniciar. Para que la dirección
`192.168.100.8` sea siempre la misma:

- **Opción A:** Reserva DHCP en el router del colegio (asignar la IP a la MAC de la PC)
- **Opción B:** IP estática manual en Windows:

```powershell
# Configuración → Red → Propiedades del WiFi → Asignación de IP → Manual
# IPv4: 192.168.100.8 | Máscara: 255.255.255.0 | Puerta de enlace: 192.168.100.1
```

### Paso 5 — (Opcional) Blindar con firewall

Si se quiere que el puerto 3000 acepte conexiones SOLO desde la subred VRC:

```powershell
# Windows Firewall — regla de entrada para el puerto 3000
# Solo permitir desde 192.168.100.0/24 (la subred del WiFi)
```

En la práctica, como la IP es privada, esto es redundante — pero si el colegio
tiene varias redes internas (docentes, invitados, laboratorios), la regla
por subred evita que invitados con IPs de otra subred entren.

---

## 3. Diagrama del resultado

```
        INTERNET (público)
             │
             ✗ NO ENTRA — la IP 192.168.x.x no existe fuera de la red
             │
   ┌─────────┴──────────┐
   │   Router del       │
   │   colegio (VRC)    │
   │                    │
   │  WiFi "VRC"        │
   │   ├─ PC servidor   │──► http://192.168.100.8:3000
   │   │   (192.168.    │     solo accesible desde aquí
   │   │    100.8)      │
   │   ├─ Celular prof. │──► http://192.168.100.8:3000 ✅
   │   ├─ Tablet        │──► http://192.168.100.8:3000 ✅
   │   └─ Otros equipos │
   └────────────────────┘
```

---

## 4. Ventajas y desventajas de este modelo

**Ventajas**
- Cero costo, cero configuración de nube
- Nadie fuera del colegio puede acceder (ni conociendo la URL)
- Los datos viajan solo por la red local

**Desventajas**
- La PC servidor debe estar encendida
- Solo funciona dentro del WiFi del colegio (no desde datos móviles)
- Si el docente sale del plantel, no puede consultar la app
- Depende de la estabilidad del WiFi y del router

---

## 5. Cuándo migrar a la nube (AWS/Render)

Si se necesita acceso desde fuera del plantel (docentes en casa, inspecciones,
acceso remoto), la arquitectura cambia:

```
App/Browser ──► Internet ──► Servidor en la nube (IP pública)
                                  │
                    Security Group / Firewall
                    (allowlist por IP del colegio o VPN)
```

Ahí la restricción "solo dentro del colegio" se logra con:
- **Lista blanca de IPs**: el firewall solo acepta la IP pública del colegio
- **VPN**: el docente se conecta a la VPN del colegio antes de entrar
- **Autenticación fuerte**: login + doble factor

Pero para el caso simple de "solo dentro del WiFi VRC", el modelo local
descrito arriba es suficiente y no requiere nada de AWS.

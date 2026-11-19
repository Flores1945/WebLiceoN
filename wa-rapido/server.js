import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import express from "express";
import qrcode from "qrcode-terminal";
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const AUTH_DIR = path.join(__dirname, "sesion");
const N8N_WEBHOOK_ENTRANTE = process.env.N8N_WEBHOOK_ENTRANTE || "";

const logger = pino({ level: "warn" });
let sock = null;
let conectado = false;
let qrActual = null;

function limpiarNumero(numero) {
    let digitos = String(numero || "").replace(/\D/g, "");
    if (/^9\d{8}$/.test(digitos)) digitos = `51${digitos}`;
    return digitos;
}

async function iniciarSocket() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ["LiceoTrujillo", "Chrome", "1.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrActual = qr;
            console.log("\n=== ESCANEA ESTE QR CON WHATSAPP > DISPOSITIVOS VINCULADOS ===\n");
            qrcode.generate(qr, { small: true });
            console.log("\n===============================================\n");
        }
        if (connection === "open") {
            conectado = true;
            qrActual = null;
            console.log("[wa-rapido] WhatsApp conectado ✔");
        }
        if (connection === "close") {
            conectado = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            const loggedOut = code === DisconnectReason.loggedOut;
            console.log(`[wa-rapido] Conexion cerrada (codigo ${code})${loggedOut ? " - sesion cerrada, borra la carpeta sesion/ y vuelve a vincular" : " - reconectando..."}`);
            if (!loggedOut) setTimeout(iniciarSocket, 3000);
        }
    });

    // Reenvia mensajes entrantes al webhook de n8n (para justificaciones/IA)
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" || !N8N_WEBHOOK_ENTRANTE) return;
        for (const msg of messages) {
            if (msg.key.fromMe) continue;
            const texto =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                "";
            if (!texto) continue;
            try {
                await fetch(N8N_WEBHOOK_ENTRANTE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        from: msg.key.remoteJid,
                        nombre: msg.pushName || "",
                        texto,
                        timestamp: msg.messageTimestamp,
                    }),
                });
            } catch (e) {
                console.error("[wa-rapido] No se pudo reenviar mensaje a n8n:", e.message);
            }
        }
    });
}

const app = express();
app.use(express.json());

app.get("/qr", (_req, res) => {
    if (!qrActual) return res.send("<h2>WhatsApp ya conectado o aun no hay QR.</h2>");
    qrcode.generate(qrActual, { small: true }, (txt) => {
        res.type("html").send("<html><body style='background:#000;color:#0f0;font-family:monospace;text-align:center;padding:20px'><pre>" + txt + "</pre></body></html>");
    });
});

app.get("/status", (_req, res) => {
    res.json({ connected: conectado, tieneQR: !!qrActual });
});

app.post("/send", async (req, res) => {
    try {
        const { number, text } = req.body || {};
        if (!number || !text) {
            return res.status(400).json({ ok: false, error: "Faltan 'number' y 'text'" });
        }
        const digitos = limpiarNumero(number);
        if (digitos.length < 10) {
            return res.status(400).json({ ok: false, error: "Numero invalido" });
        }
        if (!conectado || !sock) {
            return res.status(503).json({ ok: false, error: "WhatsApp no esta conectado. Escanea el QR en la terminal." });
        }
        const jid = `${digitos}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        res.json({ ok: true, to: jid });
    } catch (error) {
        console.error("[wa-rapido] Error al enviar:", error.message);
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[wa-rapido] Escuchando en http://localhost:${PORT}`);
    console.log(`[wa-rapido] Endpoints: GET /status | POST /send`);
    iniciarSocket();
});

const { query } = require("./db");
const { telefonoWhatsapp } = require("./notificar-n8n");

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001/send";

function mensajeAsistencia(est, estadoMySQL) {
    const nombre = `${est.nombres} ${est.apellidos}`.trim();
    const lugar = `${est.grado} "${est.seccion}"`.trim();
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hora = ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

    const textos = {
        Presente: `Asistencia registrada: ${nombre} (${lugar}) se encuentra PUNTUAL el ${fecha} a las ${hora}.`,
        Tarde: `Asistencia registrada: ${nombre} (${lugar}) llego TARDANZA el ${fecha} a las ${hora}.`,
        Ausente: `Asistencia registrada: ${nombre} (${lugar}) FALTO el ${fecha}. Si su ausencia fue justificada, responda este mensaje.`,
        Justificado: `Asistencia registrada: ${nombre} (${lugar}) tiene falta JUSTIFICADA el ${fecha}.`,
    };
    return textos[estadoMySQL] || textos.Presente;
}

// Envia el WhatsApp directo al puente local wa-rapido (fire-and-forget)
async function notificarWhatsappAsistencia(estudianteId, estadoMySQL) {
    try {
        const rows = await query(
            `SELECT e.id, e.nombres, e.apellidos, e.nivel, e.grado, e.seccion, e.turno, e.dni,
                (SELECT p.telefono
                 FROM estudiante_padre ep
                 INNER JOIN padres p ON p.id = ep.padre_id
                 WHERE ep.estudiante_id = e.id
                 LIMIT 1) AS telefono_apoderado
             FROM estudiantes e WHERE e.id = ? LIMIT 1`,
            [estudianteId]
        );
        const est = rows[0];
        if (!est || !est.telefono_apoderado) return;

        const resp = await fetch(BRIDGE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                number: telefonoWhatsapp(est.telefono_apoderado),
                text: mensajeAsistencia(est, estadoMySQL),
            }),
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            console.error("Puente WhatsApp respondio error:", data.error || resp.status);
        }
    } catch (error) {
        console.error("No se pudo enviar WhatsApp por el puente local:", error.message);
    }
}

module.exports = { notificarWhatsappAsistencia };

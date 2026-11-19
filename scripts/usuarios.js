import { apiGet, apiPost, apiPut } from "./api.js";
import { initPaginaProtegida, configurarCerrarSesion, obtenerUsuario } from "./auth-roles.js";

const usuarioActual = initPaginaProtegida("usuarios");
if (!usuarioActual) {
    throw new Error("Sin acceso a esta página.");
}
configurarCerrarSesion();

const estadoUsuarios = document.getElementById("estadoUsuarios");
const estadoMiClave = document.getElementById("estadoMiClave");
const tablaBody = document.getElementById("tablaUsuariosBody");
const totalUsuarios = document.getElementById("totalUsuarios");
const filtroCargo = document.getElementById("filtroCargo");
const filtroEstado = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

let usuarios = [];

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function formatearFecha(fecha) {
    if (!fecha) return "-";
    const d = new Date(fecha);
    return isNaN(d) ? String(fecha) : d.toLocaleDateString("es-PE");
}

function filtrarUsuarios() {
    const cargo = filtroCargo.value;
    const estado = filtroEstado.value;
    const busqueda = filtroBusqueda.value.trim().toLowerCase();

    return usuarios.filter((u) => {
        if (cargo && u.cargo !== cargo) return false;
        if (estado !== "" && Number(u.activo) !== Number(estado)) return false;
        if (busqueda) {
            const texto = `${u.nombres || ""} ${u.apellidos || ""} ${u.email || ""}`.toLowerCase();
            if (!texto.includes(busqueda)) return false;
        }
        return true;
    });
}

function renderTabla() {
    const lista = filtrarUsuarios();
    if (!lista.length) {
        tablaBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Sin usuarios que coincidan.</td></tr>`;
        return;
    }

    tablaBody.innerHTML = lista.map((u) => {
        const activo = Number(u.activo) === 1;
        const esYo = u.id === usuarioActual.id;
        const badge = activo
            ? `<span style="color:var(--verde,#16a34a);font-weight:600;">● Activo</span>`
            : `<span style="color:#dc2626;font-weight:600;">● Inactivo</span>`;
        return `<tr>
            <td>${escaparHtml(u.nombres)}</td>
            <td>${escaparHtml(u.apellidos)}</td>
            <td>${escaparHtml(u.email)}</td>
            <td>${escaparHtml(u.cargo)}${esYo ? " (tú)" : ""}</td>
            <td>${escaparHtml(u.telefono || "-")}</td>
            <td>${badge}</td>
            <td>${formatearFecha(u.fecha_creacion)}</td>
            <td>
                <button type="button" class="btn-secundario btn-reset-clave" data-id="${u.id}" data-nombre="${escaparHtml(u.nombres)} ${escaparHtml(u.apellidos)}" style="padding:4px 10px;font-size:0.85rem;">
                    🔑 ${esYo ? "Mi clave" : "Reset clave"}
                </button>
            </td>
        </tr>`;
    }).join("");

    tablaBody.querySelectorAll(".btn-reset-clave").forEach((btn) => {
        btn.addEventListener("click", () => resetearClave(Number(btn.dataset.id), btn.dataset.nombre));
    });
}

async function cargarUsuarios() {
    estadoUsuarios.textContent = "Cargando usuarios...";
    try {
        usuarios = await apiGet("/usuarios");
        totalUsuarios.textContent = usuarios.length;
        renderTabla();
        estadoUsuarios.textContent = `${usuarios.length} usuario(s) registrado(s).`;
    } catch (error) {
        estadoUsuarios.textContent = error.message || "No se pudo cargar la lista de usuarios.";
    }
}

async function resetearClave(id, nombre) {
    const nueva = prompt(`Nueva clave para ${nombre} (mínimo 6 caracteres):`);
    if (nueva === null) return;
    if (nueva.trim().length < 6) {
        alert("La clave debe tener mínimo 6 caracteres.");
        return;
    }
    try {
        await apiPut(`/usuarios/${id}/password`, { password: nueva.trim() });
        alert(`Clave de ${nombre} actualizada correctamente.`);
    } catch (error) {
        alert(error.message || "No se pudo actualizar la clave.");
    }
}

async function cambiarMiClave(evento) {
    evento.preventDefault();
    estadoMiClave.textContent = "";
    const actual = document.getElementById("claveActual").value;
    const nueva = document.getElementById("claveNueva").value;
    const nueva2 = document.getElementById("claveNueva2").value;

    if (nueva !== nueva2) {
        estadoMiClave.textContent = "Las claves nuevas no coinciden.";
        return;
    }
    try {
        await apiPost("/auth/cambiar-clave", { actual, nueva });
        estadoMiClave.textContent = "✅ Contraseña actualizada correctamente.";
        document.getElementById("formMiClave").reset();
    } catch (error) {
        estadoMiClave.textContent = error.message || "No se pudo cambiar la contraseña.";
    }
}

document.getElementById("formMiClave").addEventListener("submit", cambiarMiClave);
[filtroCargo, filtroEstado, filtroBusqueda].forEach((el) => {
    el.addEventListener("input", renderTabla);
    el.addEventListener("change", renderTabla);
});

cargarUsuarios();

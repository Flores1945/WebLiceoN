// PM2: mantiene vivos el backend y el puente de WhatsApp (reinicio automatico)
module.exports = {
    apps: [
        {
            name: "wa-rapido",
            script: "server.js",
            cwd: "C:/Desarrollo/Trabajo Oficina/I.E. WEB/wa-rapido",
            autorestart: true,
            max_restarts: 50,
            restart_delay: 3000,
        },
        {
            name: "liceo-backend",
            script: "src/index.js",
            cwd: "C:/Desarrollo/Trabajo Oficina/I.E. WEB/backend",
            autorestart: true,
            max_restarts: 50,
            restart_delay: 3000,
        },
    ],
};

/**
 * Adaptador HTTP del reemplazo de la "caja negra" (Reto 2).
 *
 * Solo habla HTTP: autenticación, rutas, límite de cuerpo, JSON y la cabecera
 * `x-req`. Toda la lógica de negocio vive en `domain.js` (dominio puro).
 *
 *   GET  /health   -> 200 {"ok":true}
 *   POST /__reset  -> 200 {"ok":true}
 *   POST /msg      -> protocolo de mensajes
 *   (cualquier otra ruta/método) -> 404 {"error":"E404","mensaje":"ruta desconocida"}
 *
 * Autenticación: `Authorization: Bearer <token>` en TODAS las rutas.
 * Token: TOKEN_API_ENTRYPOINT / TEAM_TOKEN o el .env local.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const dominio = require("./domain");

// ---------- configuración / token ----------
function loadEnv() {
  const candidates = [
    process.env.ENV_FILE,
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", ".env"),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      const txt = fs.readFileSync(file, "utf8");
      for (const line of txt.split("\n")) {
        const s = line.trim();
        if (!s || s.startsWith("#") || !s.includes("=")) continue;
        const i = s.indexOf("=");
        const k = s.slice(0, i).trim();
        const v = s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
        if (!(k in process.env)) process.env[k] = v;
      }
    } catch (_) {}
  }
}
loadEnv();

const TEAM_TOKEN = process.env.TOKEN_API_ENTRYPOINT || process.env.TEAM_TOKEN || "";
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 8191; // bytes; >= 8192 -> E101

// ---------- utilidades HTTP ----------
const json = (res, status, obj, extraHeaders = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(obj));
};

const send = (res, code, headers = {}) => {
  const [status, body] = dominio.ERRORES[code];
  json(res, status, body, headers);
};

// ---------- estado (por proceso) ----------
let state = dominio.freshState();
let xreq = 0;

// ---------- manejo de POST /msg ----------
function handleMsg(req, res) {
  const chunks = [];
  let size = 0;
  let aborted = false;

  req.on("data", (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      send(res, "E101");
      req.destroy();
      return;
    }
    chunks.push(c);
  });

  req.on("end", () => {
    if (aborted) return;

    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (_) {
      return send(res, "E100");
    }
    if (!payload || typeof payload !== "object" || typeof payload.m !== "string") {
      return send(res, "E102");
    }

    xreq += 1;
    const r = dominio.processMessage(state, payload.m);
    const headers = { "x-req": String(xreq) };

    if (r.code) {
      const [status, base] = dominio.ERRORES[r.code];
      const body = r.sugerencia ? { ...base, sugerencia: r.sugerencia } : base;
      return json(res, status, body, headers);
    }
    return json(res, r.status || 200, r.ok, headers);
  });

  req.on("error", () => { if (!aborted) send(res, "E100"); });
}

// ---------- servidor ----------
const server = http.createServer((req, res) => {
  const routePath = new URL(req.url, "http://localhost").pathname;

  const auth = req.headers["authorization"] || "";
  if (TEAM_TOKEN === "" || auth !== `Bearer ${TEAM_TOKEN}`) {
    return send(res, "E001");
  }

  if (req.method === "GET" && routePath === "/health") {
    return json(res, 200, { ok: true });
  }
  if (req.method === "POST" && routePath === "/__reset") {
    state = dominio.freshState();
    return json(res, 200, { ok: true });
  }
  if (req.method === "POST" && routePath === "/msg") {
    return handleMsg(req, res);
  }

  return send(res, "E404");
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`caja-negra-jemela escuchando en :${PORT}`));
}

module.exports = { server, control: dominio.control, processMessage: dominio.processMessage, freshState: dominio.freshState };

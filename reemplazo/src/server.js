/**
 * Adaptador HTTP del reemplazo de la "caja negra" (Reto 2).
 *
 * Solo habla HTTP: autenticación, rutas, límite de cuerpo, JSON y la cabecera
 * `x-req`. Toda la lógica de negocio vive en `domain.js` (dominio puro) y la
 * persistencia del estado en `storage.js`.
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
const { createMemoryStorage } = require("./storage");

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
// Con HEAD se responde mismo status y headers pero sin cuerpo,
// como el original (verificado: HEAD /health -> 404 de 0 bytes).
const json = (res, status, obj, extraHeaders = {}, noBody = false) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(noBody ? undefined : JSON.stringify(obj));
};

const send = (res, code, headers = {}, noBody = false) => {
  const [status, body] = dominio.ERRORES[code];
  json(res, status, body, headers, noBody);
};

// ---------- lectura de cuerpo con límite ----------
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settle = false;
    req.on("data", (c) => {
      if (settle) return;
      size += c.length;
      if (size > max) {
        settle = true;
        return reject("E101");
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!settle) {
        settle = true;
        resolve(Buffer.concat(chunks));
      }
    });
    req.on("error", () => {
      if (!settle) {
        settle = true;
        reject("E100");
      }
    });
  });
}

// ---------- manejo de POST /msg ----------
async function handleMsg(req, res, storage) {
  const head = req.method === "HEAD";
  let raw;
  try {
    raw = await readBody(req, MAX_BODY);
  } catch (code) {
    return send(res, code, {}, head);
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch (_) {
    return send(res, "E100", {}, head);
  }
  if (!payload || typeof payload !== "object" || typeof payload.m !== "string") {
    return send(res, "E102", {}, head);
  }

  const out = await storage.mutate((state, xreq) => {
    const r = dominio.processMessage(state, payload.m);
    return { r, xreq: xreq + 1 };
  });

  const headers = { "x-req": String(out.xreq) };
  const r = out.r;
  if (r.code) {
    const [status, base] = dominio.ERRORES[r.code];
    const body = r.sugerencia ? { ...base, sugerencia: r.sugerencia } : base;
    return json(res, status, body, headers, head);
  }
  return json(res, r.status || 200, r.ok, headers, head);
}

// ---------- aplicación HTTP (reutilizable por local y Vercel) ----------
function createHandler(storage) {
  return async function handler(req, res) {
    try {
      const routePath = new URL(req.url, "http://localhost").pathname;
      const auth = req.headers["authorization"] || "";
      const head = req.method === "HEAD";
      if (TEAM_TOKEN === "" || auth !== `Bearer ${TEAM_TOKEN}`) {
        return send(res, "E001", {}, head);
      }

      if (req.method === "GET" && routePath === "/health") {
        return json(res, 200, { ok: true }, {}, head);
      }
      if (req.method === "POST" && routePath === "/__reset") {
        await storage.reset();
        return json(res, 200, { ok: true }, {}, head);
      }
      if (req.method === "POST" && routePath === "/msg") {
        return handleMsg(req, res, storage);
      }

      return send(res, "E404", {}, head);
    } catch (err) {
      console.error("handler error:", err);
      if (!res.headersSent) json(res, 500, { error: "E500", mensaje: "error interno" }, {}, req.method === "HEAD");
      else res.end();
    }
  };
}

// ---------- servidor local ----------
const server = http.createServer(createHandler(createMemoryStorage()));

if (require.main === module) {
  server.listen(PORT, () => console.log(`caja-negra-jemela escuchando en :${PORT}`));
}

module.exports = {
  server,
  createHandler,
  control: dominio.control,
  processMessage: dominio.processMessage,
  freshState: dominio.freshState,
};
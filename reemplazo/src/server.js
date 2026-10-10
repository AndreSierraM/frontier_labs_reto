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
async function handleMsg(req, res, storage, maxBody, capture) {
  const head = req.method === "HEAD";
  let raw;
  try {
    raw = await readBody(req, maxBody);
  } catch (code) {
    if (capture) capture({ m: null, response: { error: code } });
    return send(res, code, {}, head);
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch (_) {
    if (capture) capture({ m: null, response: { error: "E100" } });
    return send(res, "E100", {}, head);
  }
  if (!payload || typeof payload !== "object" || typeof payload.m !== "string") {
    if (capture) capture({ m: null, response: { error: "E102" } });
    return send(res, "E102", {}, head);
  }

  const out = await storage.mutate((state, xreq) => {
    const r = dominio.processMessage(state, payload.m);
    return { r, xreq: xreq + 1 };
  });

  const headers = { "x-req": String(out.xreq) };
  const r = out.r;
  let status, body;
  if (r.code) {
    const [s, base] = dominio.ERRORES[r.code];
    status = s;
    body = { ...base };
    if (r.sugerencia) body.sugerencia = r.sugerencia;
    if (r.intentos !== undefined) body.intentos = r.intentos;
  } else {
    status = r.status || 200;
    body = r.ok;
  }
  // Instrumentación: petición + respuesta exactas (lo consume `runtime_log`).
  if (capture) capture({ m: payload.m, response: body });
  return json(res, status, body, headers, head);
}

// ---------- aplicación HTTP (reutilizable por local y Vercel) ----------
// `hooks.onRequest({method, path, status, ms})` permite observar cada request
// (instrumentación del propio servicio) sin tocar el contrato.
function createHandler(storage, { token = "", maxBody = 8191, onRequest = null } = {}) {
  return async function handler(req, res) {
    const started = Date.now();
    let path = req.url;
    let captured = null;
    try {
      path = new URL(req.url, "http://localhost").pathname;
    } catch (_) {}
    if (onRequest) {
      res.on("finish", () => {
        try {
          onRequest({ method: req.method, path, status: res.statusCode, ms: Date.now() - started, ...(captured || {}) });
        } catch (_) {}
      });
    }
    try {
      const routePath = path;
      const auth = req.headers["authorization"] || "";
      const head = req.method === "HEAD";
      if (token === "" || auth !== `Bearer ${token}`) {
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
        return handleMsg(req, res, storage, maxBody, (info) => { captured = info; });
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
if (require.main === module) {
  loadEnv();
  const port = Number(process.env.PORT || 3000);
  const server = http.createServer(
    createHandler(createMemoryStorage(), {
      token: process.env.TOKEN_API_ENTRYPOINT || process.env.TEAM_TOKEN || "",
    })
  );
  server.listen(port, () => console.log(`caja-negra-jemela escuchando en :${port}`));
}

module.exports = {
  createHandler,
  loadEnv,
  control: dominio.control,
  processMessage: dominio.processMessage,
  freshState: dominio.freshState,
};
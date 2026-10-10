/**
 * Helpers comunes de las funciones serverless (Vercel): respuesta JSON,
 * autenticación por token y lectura de cuerpo. Una sola implementación.
 */
"use strict";

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

/** Acepta `Authorization: Bearer <secret>` o `?token=<secret>`. */
function authorized(req, secret) {
  if (!secret) return false;
  const auth = req.headers["authorization"] || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let q = "";
  try {
    q = new URL(req.url, "http://localhost").searchParams.get("token") || "";
  } catch (_) {}
  return bearer === secret || q === secret;
}

/** Lee y parsea el cuerpo JSON; devuelve `fallback` (por defecto {}) si falla. */
async function readJson(req, fallback = {}) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

module.exports = { json, authorized, readJson };
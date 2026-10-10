/**
 * POST /api/monitor/ack  -> marca como atendido el último cambio detectado.
 * Inserta un evento `adaptation_applied` para que `agent/adapt.mjs` no vuelva
 * a adaptar el mismo cambio en bucle.
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj, null, 2));
}

function authorized(req, secret) {
  const auth = req.headers["authorization"] || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let q = "";
  try {
    q = new URL(req.url, "http://localhost").searchParams.get("token") || "";
  } catch (_) {}
  return Boolean(secret) && (bearer === secret || q === secret);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  let payload = {};
  try {
    const raw = await readBody(req);
    if (raw) payload = JSON.parse(raw);
  } catch (_) {
    payload = {};
  }

  const pool = getPool();
  await store.ensure(pool);
  await store.recordEvent(
    pool,
    "adaptation_applied",
    typeof payload.label === "string" ? payload.label : null,
    null,
    null,
    payload.commit ? `commit ${payload.commit}` : "atendido por el agente"
  );

  json(res, 200, { ok: true });
};
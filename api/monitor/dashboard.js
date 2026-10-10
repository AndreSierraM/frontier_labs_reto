/**
 * GET /api/monitor/dashboard
 *
 * Resumen para el panel: qué cambió en el original + cómo está y qué hizo
 * NUESTRO servicio (transacciones, errores y latencia de `runtime_log`).
 * Protegido con `MONITOR_TOKEN` (acepta `?token=`).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
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

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const pool = getPool();
  await store.ensure(pool);

  let runtime = null;
  try {
    runtime = await store.runtimeSummary(pool, 60);
  } catch (_) {
    runtime = null;
  }

  const last = await store.lastSnapshot(pool);
  const events = await store.history(pool, 30);

  json(res, 200, {
    ok: true,
    now: new Date().toISOString(),
    original: {
      url: process.env.URL_API_ENTRYPOINT || null,
      lastSnapshot: last
        ? { id: last.id, taken_at: last.taken_at, target_url: last.target_url, fingerprint: last.fingerprint }
        : null,
    },
    replacement: {
      url: process.env.MONITOR_TARGET_URL || "https://frontier-labs-reto.vercel.app",
      runtime,
    },
    events,
  });
};
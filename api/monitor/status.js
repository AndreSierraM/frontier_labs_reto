/**
 * GET /api/monitor/status  -> último snapshot y eventos recientes.
 * Protegido con `MONITOR_TOKEN` (acepta `?token=`).
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

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const pool = getPool();
  await store.ensure(pool);

  const last = await store.lastSnapshot(pool);
  const events = await store.history(pool, 25);

  json(res, 200, {
    ok: true,
    original: process.env.URL_API_ENTRYPOINT || null,
    replacement: process.env.MONITOR_TARGET_URL || "https://frontier-labs-reto.vercel.app",
    lastSnapshot: last
      ? {
          id: last.id,
          taken_at: last.taken_at,
          target_url: last.target_url,
          fingerprint: last.fingerprint,
          foto: last.foto,
        }
      : null,
    events,
  });
};
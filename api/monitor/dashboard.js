/**
 * GET /api/monitor/dashboard -> resumen para el panel: qué cambió en el
 * original + cómo está y qué hizo NUESTRO servicio (runtime_log).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const { json, authorized } = require("../../monitor/serverless");

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const pool = getPool();
  await store.ensure(pool);

  let runtime = null;
  try {
    runtime = await store.runtimeSummary(pool, 60);
  } catch (_) {}

  const last = await store.lastSnapshot(pool);
  const events = await store.history(pool, 30);
  let agentRuns = [];
  try {
    agentRuns = await store.listAgentRuns(pool, 12);
  } catch (_) {}

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
    agentRuns,
  });
};
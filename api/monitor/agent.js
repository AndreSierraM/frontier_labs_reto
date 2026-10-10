/**
 * /api/monitor/agent
 *
 *   GET  → últimas corridas del enjambre (para el panel).
 *   POST → el pipeline reporta una corrida (estado, etiquetas, revisión).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const { json, authorized, readJson } = require("../../monitor/serverless");

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const pool = getPool();
  await store.ensure(pool);

  if (req.method === "GET") {
    return json(res, 200, { ok: true, runs: await store.listAgentRuns(pool, 12) });
  }
  if (req.method !== "POST") return json(res, 405, { error: "E405" });

  const payload = await readJson(req, {});
  await store.saveAgentRun(pool, payload);
  json(res, 200, { ok: true });
};
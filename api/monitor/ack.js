/**
 * POST /api/monitor/ack  -> marca como atendido el último cambio detectado
 * (inserta `adaptation_applied` para que el enjambre no repita el mismo cambio).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const { json, authorized, readJson } = require("../../monitor/serverless");

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const payload = await readJson(req);
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
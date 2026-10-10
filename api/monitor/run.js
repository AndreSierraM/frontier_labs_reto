/**
 * GET /api/monitor/run  (objetivo del cron / bucle)
 *
 * 1. Corre la batería contra el ORIGINAL y guarda un snapshot.
 * 2. Compara con el anterior → eventos `original_changed`.
 * 3. `/health` del REEMPLAZO (no destructivo); diferencial completo solo con
 *    `?differential=1` (la batería incluye __reset y no debe correr en cada tick).
 * 4. Dispara alerta si hay cambios (ALERT_WEBHOOK_URL).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const observe = require("../../monitor/observe");
const kinds = require("../../monitor/kinds");
const { json, authorized } = require("../../monitor/serverless");

const normalize = (url) => String(url || "").replace(/\/$/, "");

async function alert(result) {
  const url = process.env.ALERT_WEBHOOK_URL;
  const hasChange = result.changes.length > 0;
  const hasDivergence = result.divergences.length > 0;
  if (!url || (!hasChange && !hasDivergence)) return false;
  const lines = ["🚨 Monitor caja negra"];
  if (hasChange) lines.push(`Original cambió (${result.changes.length}): ${result.changes.map((c) => c.label).join(", ")}`);
  if (hasDivergence) lines.push(`Reemplazo diverge (${result.divergences.length}): ${result.divergences.map((d) => d.label).join(", ")}`);
  lines.push(result.at);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n"), content: lines.join("\n") }),
      signal: AbortSignal.timeout(10000),
    });
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const originalUrl = normalize(process.env.URL_API_ENTRYPOINT);
  const originalToken = process.env.TOKEN_CAJA_NEGRA || "";
  const replUrl = normalize(process.env.MONITOR_TARGET_URL || "https://frontier-labs-reto.vercel.app");
  const replToken = process.env.TOKEN_API_ENTRYPOINT || "";
  if (!originalUrl || !originalToken) {
    return json(res, 500, { error: "E500", mensaje: "faltan URL_API_ENTRYPOINT o TOKEN_CAJA_NEGRA" });
  }

  const pool = getPool();
  await store.ensure(pool);

  const result = {
    at: new Date().toISOString(),
    original: { url: originalUrl },
    replacement: { url: replUrl },
    changes: [],
    divergences: [],
    alerted: false,
  };

  // 1) Original (aborta rápido ante 429/infra para no agotar el tiempo).
  const foto = await observe.runBattery(originalUrl, originalToken, { abortOnInfra: true });
  result.original.samples = Object.keys(foto).length;
  result.original.rateLimited = observe.hasInfra(foto);
  if (result.original.rateLimited) {
    await store.recordEvent(pool, kinds.KIND.ORIGINAL_RATELIMITED, null, null, null, "la sonda topó con 429/infra; detección omitida");
    return json(res, 200, { ok: true, ...result, omitted: true });
  }

  const prev = await store.lastSnapshot(pool);
  result.changes = prev ? observe.diff(prev.foto, foto).diffs : [];
  result.original.fingerprint = observe.fingerprint(foto);
  result.original.changed = result.changes.length > 0;

  const snap = await store.saveSnapshot(pool, originalUrl, result.original.fingerprint, foto);
  result.original.snapshotId = snap.id;
  result.original.takenAt = snap.taken_at;
  result.original.baseline = prev ? prev.id : null;
  if (result.changes.length) {
    await store.recordEvents(pool, kinds.KIND.ORIGINAL_CHANGED, result.changes, prev ? `vs snapshot #${prev.id}` : null);
  }

  // 2) Reemplazo: salud siempre; diferencial solo bajo demanda.
  const replHealth = await observe.health(replUrl, replToken);
  result.replacement.healthy = replHealth.ok;
  result.replacement.healthStatus = replHealth.status;

  let wantDifferential = false;
  try {
    wantDifferential = new URL(req.url, "http://localhost").searchParams.get("differential") === "1";
  } catch (_) {}

  if (wantDifferential) {
    const replFoto = await observe.runBattery(replUrl, replToken);
    result.divergences = observe.diff(foto, replFoto).diffs;
    result.replacement.divergences = result.divergences.length;
    if (result.divergences.length) {
      await store.recordEvents(pool, kinds.KIND.REPLACEMENT_DIVERGENT, result.divergences, "original vs reemplazo");
    }
  } else {
    result.replacement.differentialSkipped = true;
  }
  if (!replHealth.ok) {
    await store.recordEvent(pool, kinds.KIND.REPLACEMENT_UNHEALTHY, null, null, null, `health status ${replHealth.status}`);
  }

  result.alerted = await alert(result);
  json(res, 200, { ok: true, ...result });
};
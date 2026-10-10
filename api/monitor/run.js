/**
 * POST/GET /api/monitor/run  (objetivo del cron de Vercel)
 *
 * 1. Corre la batería contra el ORIGINAL y guarda un snapshot.
 * 2. Compara con el snapshot anterior -> eventos `original_changed`.
 * 3. Corre la batería contra el REEMPLAZO -> eventos `replacement_divergent`.
 * 4. Comprueba /health del reemplazo (self-heal observable).
 * 5. Dispara alerta si hay cambios (ALERT_WEBHOOK_URL).
 *
 * Protegido con `MONITOR_TOKEN` (o `CRON_SECRET`, que Vercel envía al cron).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const { runBattery, health, diffLabels, fingerprint } = require("../../monitor/battery");

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

function normalize(url) {
  return String(url || "").replace(/\/$/, "");
}

async function alert(result) {
  const url = process.env.ALERT_WEBHOOK_URL;
  const hasChange = result.changes.length > 0;
  const hasDivergence = result.divergences.length > 0;
  if (!url || (!hasChange && !hasDivergence)) return false;
  const lines = ["🚨 Monitor caja negra"];
  if (hasChange) lines.push(`Original cambió (${result.changes.length}): ${result.changes.map((c) => c.label).join(", ")}`);
  if (hasDivergence) lines.push(`Reemplazo diverge (${result.divergences.length}): ${result.divergences.map((d) => d.label).join(", ")}`);
  lines.push(result.at);
  const text = lines.join("\n");
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }),
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

  // 1) Original
  const fotoOrig = await runBattery(originalUrl, originalToken);
  const prev = await store.lastSnapshot(pool);
  result.changes = prev ? diffLabels(prev.foto, fotoOrig) : [];
  result.original.samples = Object.keys(fotoOrig).length;
  result.original.fingerprint = fingerprint(fotoOrig);
  result.original.changed = result.changes.length > 0;

  const snap = await store.saveSnapshot(pool, originalUrl, result.original.fingerprint, fotoOrig);
  result.original.snapshotId = snap.id;
  result.original.takenAt = snap.taken_at;
  result.original.baseline = prev ? prev.id : null;

  if (result.changes.length) {
    await store.recordEvents(pool, "original_changed", result.changes, prev ? `vs snapshot #${prev.id}` : null);
  }

  // 2) Reemplazo: sólo salud (no destructivo). El diferencial completo se
  //    ejecuta únicamente con ?differential=1: la batería incluye __reset y
  //    durante el demo day no debe borrar el estado de un test en curso.
  const replHealth = await health(replUrl, replToken);
  result.replacement.healthy = replHealth.ok;
  result.replacement.healthStatus = replHealth.status;

  let wantDifferential = false;
  try {
    wantDifferential = new URL(req.url, "http://localhost").searchParams.get("differential") === "1";
  } catch (_) {}

  if (wantDifferential) {
    try {
      const fotoRepl = await runBattery(replUrl, replToken);
      result.divergences = diffLabels(fotoOrig, fotoRepl);
      result.replacement.divergences = result.divergences.length;
      if (result.divergences.length) {
        await store.recordEvents(pool, "replacement_divergent", result.divergences, "original vs reemplazo");
      }
    } catch (e) {
      result.replacement.error = String(e && e.message);
      await store.recordEvent(pool, "replacement_unreachable", null, null, null, result.replacement.error);
    }
  } else {
    result.replacement.differentialSkipped = true;
  }

  if (!replHealth.ok) {
    await store.recordEvent(pool, "replacement_unhealthy", null, null, null, `health status ${replHealth.status}`);
  }

  // 3) Alerta
  result.alerted = await alert(result);

  json(res, 200, { ok: true, ...result });
};
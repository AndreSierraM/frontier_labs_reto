/**
 * /api/monitor/map
 *
 *   GET  → último mapa guardado del original.
 *   POST → recibe un mapa nuevo ({map}), lo compara con el anterior y registra
 *          eventos por cada valor NUEVO o CAMBIADO. Devuelve el diff; el runner
 *          lo usa para despertar al enjambre.
 *
 * Protegido con `MONITOR_TOKEN` (acepta `?token=`).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const { fingerprint, hasInfra } = require("../../monitor/battery");
const { diffMap } = require("../../monitor/probes");

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

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async (req, res) => {
  const secret = process.env.MONITOR_TOKEN || process.env.CRON_SECRET;
  if (!authorized(req, secret)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });

  const pool = getPool();
  await store.ensure(pool);

  if (req.method === "GET") {
    const last = await store.lastMap(pool);
    return json(res, 200, {
      ok: true,
      map: last
        ? {
            id: last.id,
            taken_at: last.taken_at,
            fingerprint: last.fingerprint,
            total: Object.keys(last.map).length,
            samples: last.map,
          }
        : null,
    });
  }

  if (req.method !== "POST") return json(res, 405, { error: "E405" });

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw);
  } catch (_) {
    return json(res, 400, { error: "E100", mensaje: "json inválido" });
  }
  const map = payload && payload.map;
  if (!map || typeof map !== "object") return json(res, 400, { error: "E102", mensaje: "falta map" });

  // Un mapa con rate-limit no es un mapa válido: no se guarda ni compara.
  if (hasInfra(map)) {
    await store.recordEvent(pool, "map_ratelimited", null, null, null, "recon topó con 429/infra");
    return json(res, 200, { ok: true, skipped: "rate-limited", changed: false, added: [], changedLabels: [] });
  }

  const prev = await store.lastMap(pool);
  const diff = prev ? diffMap(prev.map, map) : { added: [], changed: [], removed: [], total: Object.keys(map).length };
  const fp = fingerprint(map);
  const saved = await store.saveMap(pool, fp, map);

  if (prev && (diff.added.length || diff.changed.length)) {
    // Resumen compacto (sin volcar los mapas completos).
    await store.recordEvent(
      pool,
      "map_changed",
      null,
      null,
      null,
      `nuevos: ${diff.added.length}, cambiados: ${diff.changed.length}, removidos: ${diff.removed.length}`
    );

    const isUnknown = (s) => Boolean(s) && s.response && s.response.error === "E301";

    for (const label of diff.added) {
      const kind = label.startsWith("cmd:") ? "new_command" : label.startsWith("route:") ? "new_route" : "map_added";
      await store.recordEvent(pool, kind, label, null, map[label], "comportamiento nuevo detectado");
    }
    for (const label of diff.changed) {
      const before = prev.map[label];
      const after = map[label];
      // Un comando candidato que dejó de ser "desconocido" (E301) es un comando NUEVO.
      const newCommand = label.startsWith("cmd:") && isUnknown(before) && !isUnknown(after);
      // Una ruta que dejó de ser 404 es una ruta NUEVA.
      const newRoute = label.startsWith("route:") && before && before.status === 404 && after && after.status !== 404;
      const kind = newCommand ? "new_command" : newRoute ? "new_route" : "map_value_changed";
      await store.recordEvent(pool, kind, label, before, after, newCommand ? "comando nuevo" : "respuesta cambiada");
    }
  }

  const changed = Boolean(prev && (diff.added.length || diff.changed.length));
  json(res, 200, {
    ok: true,
    baseline: Boolean(prev),
    changed,
    added: diff.added,
    changedLabels: diff.changed,
    removed: diff.removed,
    total: diff.total,
    mapId: saved.id,
  });
};
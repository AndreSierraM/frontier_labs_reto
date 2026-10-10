/**
 * /api/monitor/map
 *
 *   GET  → último mapa guardado del original (con sus muestras).
 *   POST → recibe un mapa nuevo, lo compara con el anterior y registra eventos
 *          por cada comportamiento NUEVO (comando/ruta) o CAMBIADO.
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const observe = require("../../monitor/observe");
const { json, authorized, readJson } = require("../../monitor/serverless");

const isUnknown = (s) => Boolean(s) && s.response && s.response.error === "E301";
const notFound = (s) => Boolean(s) && s.status === 404;

/** Clasifica una diferencia del mapa en un evento concreto. */
function classify(prev, next, label) {
  if (!(label in prev)) return label.startsWith("cmd:") ? "new_command" : label.startsWith("route:") ? "new_route" : "map_added";
  if (label.startsWith("cmd:") && isUnknown(prev[label]) && !isUnknown(next[label])) return "new_command";
  if (label.startsWith("route:") && notFound(prev[label]) && !notFound(next[label])) return "new_route";
  return "map_value_changed";
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
        ? { id: last.id, taken_at: last.taken_at, fingerprint: last.fingerprint, total: Object.keys(last.map).length, samples: last.map }
        : null,
    });
  }
  if (req.method !== "POST") return json(res, 405, { error: "E405" });

  const payload = await readJson(req, null);
  const map = payload && payload.map;
  if (!map || typeof map !== "object") return json(res, 400, { error: "E102", mensaje: "falta map" });

  // Un mapa con rate-limit no es válido: no se guarda ni compara.
  if (observe.hasInfra(map)) {
    await store.recordEvent(pool, "map_ratelimited", null, null, null, "recon topó con 429/infra");
    return json(res, 200, { ok: true, skipped: "rate-limited", changed: false, added: [], changedLabels: [] });
  }

  const prev = await store.lastMap(pool);
  const d = prev ? observe.diff(prev.map, map) : { added: [], changed: [], removed: [], diffs: [] };
  const saved = await store.saveMap(pool, observe.fingerprint(map), map);

  if (prev && (d.added.length || d.changed.length)) {
    await store.recordEvent(pool, "map_changed", null, null, null,
      `nuevos: ${d.added.length}, cambiados: ${d.changed.length}, removidos: ${d.removed.length}`);
    for (const diff of d.diffs) {
      const kind = classify(prev.map, map, diff.label);
      await store.recordEvent(pool, kind, diff.label, diff.before, diff.after, kind === "new_command" ? "comando nuevo" : kind === "new_route" ? "ruta nueva" : "respuesta cambiada");
    }
  }

  const changed = Boolean(prev && (d.added.length || d.changed.length));
  json(res, 200, {
    ok: true,
    baseline: Boolean(prev),
    changed,
    added: d.added,
    changedLabels: d.changed,
    removed: d.removed,
    total: Object.keys(map).length,
    mapId: saved.id,
  });
};
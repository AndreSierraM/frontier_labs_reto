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
const kinds = require("../../monitor/kinds");
const { json, authorized, readJson } = require("../../monitor/serverless");

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

  // Filtra las muestras de infraestructura: un mapa parcial sigue sirviendo
  // para detectar cambios; solo se descarta si NADA respondió.
  const clean = observe.withoutInfra(map);
  if (Object.keys(clean).length === 0) {
    await store.recordEvent(pool, kinds.KIND.MAP_RATELIMITED, null, null, null, "recon topó con 429/infra");
    return json(res, 200, { ok: true, skipped: "rate-limited", changed: false, added: [], changedLabels: [] });
  }

  const prev = await store.lastMap(pool);
  // Si el catálogo de sondas cambió, re-baselinamos (sin eventos).
  const catalog = observe.catalogKey();
  const rebaseline = Boolean(prev && (!prev.catalog || prev.catalog !== catalog));
  const baseline = prev && !rebaseline ? observe.withoutInfra(prev.map) : null;
  const d = baseline ? observe.diff(baseline, clean) : { added: [], changed: [], removed: [], diffs: [] };
  const merged = { ...(baseline || {}), ...clean };
  const saved = await store.saveMap(pool, observe.fingerprint(merged), merged, catalog);

  if (baseline && (d.added.length || d.changed.length)) {
    await store.recordEvent(pool, kinds.KIND.MAP_CHANGED, null, null, null,
      `nuevos: ${d.added.length}, cambiados: ${d.changed.length}, removidos: ${d.removed.length}`);
    for (const diff of d.diffs) {
      const kind = kinds.classify(baseline, clean, diff.label);
      await store.recordEvent(pool, kind, diff.label, diff.before, diff.after, kind === kinds.KIND.NEW_COMMAND ? "comando nuevo" : kind === kinds.KIND.NEW_ROUTE ? "ruta nueva" : "respuesta cambiada");
    }
  }

  const changed = Boolean(baseline && (d.added.length || d.changed.length));
  json(res, 200, {
    ok: true,
    baseline: Boolean(baseline),
    changed,
    added: d.added,
    changedLabels: d.changed,
    removed: d.removed,
    total: Object.keys(clean).length,
    mapId: saved.id,
  });
};
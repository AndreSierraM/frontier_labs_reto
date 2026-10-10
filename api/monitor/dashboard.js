/**
 * GET /api/monitor/dashboard -> resumen para el panel: qué cambió en el
 * original + cómo está y qué hizo NUESTRO servicio (runtime_log).
 *
 * Solo lectura y público: no expone secretos (rutas, estados y eventos).
 * Las operaciones que mutan (`/run`, `/map` POST, `/ack`, `/agent` POST) sí
 * siguen protegidas con `MONITOR_TOKEN`.
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const kinds = require("../../monitor/kinds");
const { json } = require("../../monitor/serverless");

const eventDetail = (e) => (e.after && e.after.response ? JSON.stringify(e.after.response) : e.message || "");

/** Une eventos del monitor y corridas del enjambre en una línea de tiempo. */
function buildTimeline(events, runs) {
  const items = [];
  for (const e of events || []) {
    const type = kinds.timelineType(e.kind);
    items.push({ at: e.detected_at, type, kind: e.kind, label: e.label || null, detail: eventDetail(e) });
  }
  for (const r of runs || []) {
    items.push({
      at: r.at,
      type: "agent",
      kind: r.status,
      label: r.labels || null,
      detail: (r.review || "").split("\n").find((l) => l.trim()) || "",
      runUrl: r.run_url || null,
      prUrl: r.pr_url || null,
    });
  }
  return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 80);
}

module.exports = async (req, res) => {
  const pool = getPool();
  await store.ensure(pool);

  // TEMPORAL · diagnóstico: ?trace=1&from=<iso>&to=<iso> vuelca la timeline
  // de /msg y /__reset para reconstruir las corridas del set oculto.
  let q = null;
  try {
    q = new URL(req.url, "http://localhost").searchParams;
  } catch (_) {}
  if (q && q.get("trace") === "1") {
    const from = q.get("from") || "1970-01-01T00:00:00Z";
    const to = q.get("to") || new Date().toISOString();
    const limit = Math.min(Number(q.get("limit") || 5000), 20000);
    const { rows } = await pool.query(
      `SELECT id, at, method, path, status, ms, m, response FROM runtime_log
        WHERE at >= $1 AND at <= $2 AND path IN ('/msg','/__reset')
        ORDER BY id LIMIT $3`,
      [from, to, limit]
    );
    return json(res, 200, { ok: true, from, to, n: rows.length, rows });
  }

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
    timeline: buildTimeline(events, agentRuns),
  });
};
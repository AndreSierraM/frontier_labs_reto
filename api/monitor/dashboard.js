/**
 * GET /api/monitor/dashboard -> resumen para el panel: qué cambió en el
 * original + cómo está y qué hizo NUESTRO servicio (runtime_log).
 */
"use strict";

const { getPool } = require("../../monitor/db");
const store = require("../../monitor/store");
const { json, authorized } = require("../../monitor/serverless");

const CHANGE_KINDS = ["original_changed", "new_command", "new_route", "map_value_changed", "map_added", "replacement_divergent"];
const INFRA_KINDS = ["original_ratelimited", "map_ratelimited"];

const eventDetail = (e) => (e.after && e.after.response ? JSON.stringify(e.after.response) : e.message || "");

/** Une eventos del monitor y corridas del enjambre en una línea de tiempo. */
function buildTimeline(events, runs) {
  const items = [];
  for (const e of events || []) {
    const type = CHANGE_KINDS.includes(e.kind) ? "change" : e.kind === "adaptation_applied" ? "ack" : INFRA_KINDS.includes(e.kind) ? "infra" : "event";
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
    timeline: buildTimeline(events, agentRuns),
  });
};
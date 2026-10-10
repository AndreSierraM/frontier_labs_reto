/**
 * Persistencia del monitor: snapshots de la batería y eventos de incidente.
 *
 *   monitor_snapshots : una foto por corrida (url, fingerprint, foto jsonb)
 *   monitor_events    : cambios detectados y divergencias, con antes/después
 */
"use strict";

async function ensure(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS monitor_snapshots (
       id serial PRIMARY KEY,
       taken_at timestamptz NOT NULL DEFAULT now(),
       target_url text NOT NULL,
       fingerprint text NOT NULL,
       foto jsonb NOT NULL
     )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS monitor_events (
       id serial PRIMARY KEY,
       detected_at timestamptz NOT NULL DEFAULT now(),
       kind text NOT NULL,
       label text,
       before jsonb,
       after jsonb,
       message text
     )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS monitor_maps (
       id serial PRIMARY KEY,
       taken_at timestamptz NOT NULL DEFAULT now(),
       fingerprint text NOT NULL,
       map jsonb NOT NULL
     )`
  );
}

async function lastMap(pool) {
  const { rows } = await pool.query(
    `SELECT id, taken_at, fingerprint, map FROM monitor_maps ORDER BY id DESC LIMIT 1`
  );
  return rows[0] || null;
}

async function saveMap(pool, fp, map) {
  const { rows } = await pool.query(
    `INSERT INTO monitor_maps (fingerprint, map) VALUES ($1, $2) RETURNING id, taken_at`,
    [fp, JSON.stringify(map)]
  );
  return rows[0];
}

async function lastSnapshot(pool) {
  const { rows } = await pool.query(
    `SELECT id, taken_at, target_url, fingerprint, foto
       FROM monitor_snapshots ORDER BY id DESC LIMIT 1`
  );
  return rows[0] || null;
}

async function saveSnapshot(pool, targetUrl, fp, foto) {
  const { rows } = await pool.query(
    `INSERT INTO monitor_snapshots (target_url, fingerprint, foto)
     VALUES ($1, $2, $3) RETURNING id, taken_at`,
    [targetUrl, fp, JSON.stringify(foto)]
  );
  return rows[0];
}

async function recordEvent(pool, kind, label, before, after, message) {
  await pool.query(
    `INSERT INTO monitor_events (kind, label, before, after, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [kind, label, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), message || null]
  );
}

async function recordEvents(pool, kind, diffs, message) {
  for (const d of diffs) {
    await recordEvent(pool, kind, d.label, d.before, d.after, message);
  }
}

async function history(pool, limit = 20) {
  const { rows } = await pool.query(
    `SELECT id, detected_at, kind, label, before, after, message
       FROM monitor_events ORDER BY id DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

// ---------- observación del propio servicio ----------
async function runtimeSummary(pool, minutes = 60) {
  const totals = await pool.query(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE status >= 500)::int AS errors5xx,
            count(*) FILTER (WHERE status >= 400)::int AS errors4xx,
            coalesce(round(avg(ms)), 0)::int AS avg_ms,
            coalesce(max(ms), 0)::int AS max_ms
       FROM runtime_log
      WHERE at > now() - ($1 * interval '1 minute')`,
    [minutes]
  );
  const byPath = await pool.query(
    `SELECT path,
            count(*)::int AS n,
            count(*) FILTER (WHERE status >= 400)::int AS errors,
            coalesce(round(avg(ms)), 0)::int AS avg_ms
       FROM runtime_log
      WHERE at > now() - ($1 * interval '1 minute')
      GROUP BY path ORDER BY n DESC LIMIT 12`,
    [minutes]
  );
  const recentErrors = await pool.query(
    `SELECT at, method, path, status, ms
       FROM runtime_log
      WHERE status >= 400 AND at > now() - interval '1 day'
      ORDER BY id DESC LIMIT 10`
  );
  const recentTx = await pool.query(
    `SELECT at, method, path, status, ms
       FROM runtime_log
      WHERE path IN ('/msg', '/__reset')
      ORDER BY id DESC LIMIT 10`
  );
  return {
    window_minutes: minutes,
    totals: totals.rows[0],
    byPath: byPath.rows,
    recentErrors: recentErrors.rows,
    recentTransactions: recentTx.rows,
  };
}

module.exports = {
  ensure,
  lastSnapshot,
  saveSnapshot,
  recordEvent,
  recordEvents,
  history,
  runtimeSummary,
  lastMap,
  saveMap,
};
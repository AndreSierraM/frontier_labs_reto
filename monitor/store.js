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

module.exports = { ensure, lastSnapshot, saveSnapshot, recordEvent, recordEvents, history };
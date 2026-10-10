/**
 * Instrumentación del entrypoint: buffer de logs con batch INSERT.
 *
 * Puro side-effect; no toca la lógica de negocio. Se inicializa con un pool
 * de pg y devuelve la función `recordRequest` lista para conectarse al hook
 * `onRequest` de createHandler.
 */
"use strict";

const LOG_BATCH_SIZE = 12;
const LOG_FLUSH_MS = 200;

function createInstrumentation(pool) {
  let logBuffer = [];
  let logFlushTimer = null;

  async function flushLogs() {
    if (logBuffer.length === 0) return;
    const batch = logBuffer.splice(0, logBuffer.length);
    clearTimeout(logFlushTimer);
    logFlushTimer = null;

    const values = [];
    const params = [];
    let idx = 1;
    for (const r of batch) {
      values.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
      params.push(
        r.method,
        r.path,
        r.status,
        r.ms,
        r.m == null ? null : String(r.m),
        r.response == null ? null : JSON.stringify(r.response)
      );
    }
    const sql = `INSERT INTO runtime_log (method, path, status, ms, m, response) VALUES ${values.join(",")}`;
    pool.query(sql, params).catch(() => {});

    if (Math.random() < 0.02) {
      pool.query(`DELETE FROM runtime_log WHERE at < now() - interval '2 days'`).catch(() => {});
    }
  }

  function scheduleLogFlush() {
    if (logFlushTimer) return;
    logFlushTimer = setTimeout(() => {
      logFlushTimer = null;
      flushLogs();
    }, LOG_FLUSH_MS);
  }

  function recordRequest(r) {
    logBuffer.push(r);
    if (logBuffer.length >= LOG_BATCH_SIZE) {
      flushLogs();
    } else {
      scheduleLogFlush();
    }
  }

  // Intenta vaciar el buffer pendiente (útil en el finally del handler).
  async function drain() {
    if (logBuffer.length > 0) await flushLogs();
  }

  // DDL de la tabla de logs (una sola vez por instancia).
  async function ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS runtime_log (
        id bigserial PRIMARY KEY,
        at timestamptz NOT NULL DEFAULT now(),
        method text NOT NULL,
        path text NOT NULL,
        status integer NOT NULL,
        ms integer NOT NULL
      );
      ALTER TABLE runtime_log ADD COLUMN IF NOT EXISTS m text;
      ALTER TABLE runtime_log ADD COLUMN IF NOT EXISTS response jsonb;
      CREATE INDEX IF NOT EXISTS runtime_log_at_idx ON runtime_log (at DESC);
    `);
  }

  return { recordRequest, flushLogs, drain, ensureTable };
}

module.exports = { createInstrumentation };

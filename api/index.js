/**
 * Entrypoint serverless para Vercel.
 *
 * Reutiliza el handler HTTP del reemplazo (`reemplazo/src/server.js`) con el
 * estado en PostgreSQL (Neon). La instrumentación (logs + DDL) vive en
 * `instrumentation.js`; el arranque de storage vive en `storage.js`.
 *
 * Variables de entorno requeridas en Vercel:
 *   - DATABASE_URL          cadena *pooled* de Neon
 *   - TOKEN_API_ENTRYPOINT  token Bearer del equipo
 */
"use strict";

const { Pool } = require("pg");
const { createHandler, loadEnv } = require("../reemplazo/src/server");
const { createPostgresStorage } = require("../reemplazo/src/storage");
const { createInstrumentation } = require("./instrumentation");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const storage = createPostgresStorage(pool);
const ins = createInstrumentation(pool);

loadEnv();
const handler = createHandler(storage, {
  token: process.env.TOKEN_API_ENTRYPOINT || process.env.TEAM_TOKEN || "",
  onRequest: ins.recordRequest,
});

// ---------- arranque (DDL una sola vez por instancia) ----------
let ready = null;
function ensureReady() {
  if (ready) return ready;
  ready = (async () => {
    await storage.ensure();
    await ins.ensureTable();
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

module.exports = async (req, res) => {
  await ensureReady();
  try {
    return await handler(req, res);
  } finally {
    ins.flushLogs();
  }
};
/**
 * Entrypoint serverless para Vercel.
 *
 * Reutiliza el mismo handler HTTP del reemplazo (`reemplazo/src/server.js`) y
 * sustituye el estado en memoria por PostgreSQL (Neon) a través de
 * `reemplazo/src/storage.js`.
 *
 * Variables de entorno requeridas en Vercel:
 *   - DATABASE_URL          cadena *pooled* de Neon
 *   - TOKEN_API_ENTRYPOINT  token Bearer del equipo
 */
"use strict";

const { Pool } = require("pg");
const { createHandler } = require("../reemplazo/src/server");
const { createPostgresStorage } = require("../reemplazo/src/storage");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: { rejectUnauthorized: false },
});

const storage = createPostgresStorage(pool);
const handler = createHandler(storage);

let ready = null;
function ensureReady() {
  if (!ready) {
    ready = storage.ensure().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

module.exports = async (req, res) => {
  await ensureReady();
  return handler(req, res);
};
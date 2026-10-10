/**
 * Entrypoint serverless para Vercel.
 *
 * Reutiliza el handler HTTP del reemplazo (`reemplazo/src/server.js`) con el
 * estado en PostgreSQL (Neon) y añade instrumentación: cada request se registra
 * en `runtime_log` para observar el propio servicio (transacciones, errores,
 * latencia) además del sistema original.
 *
 * Variables de entorno requeridas en Vercel:
 *   - DATABASE_URL          cadena *pooled* de Neon
 *   - TOKEN_API_ENTRYPOINT  token Bearer del equipo
 */
"use strict";

const { Pool } = require("pg");
const { createHandler, loadEnv } = require("../reemplazo/src/server");
const { createPostgresStorage } = require("../reemplazo/src/storage");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: { rejectUnauthorized: false },
});

const storage = createPostgresStorage(pool);

// Instrumentación "fire and forget": nunca bloquea ni altera la respuesta.
function recordRequest(r) {
  pool
    .query(
      `INSERT INTO runtime_log (method, path, status, ms, m, response) VALUES ($1, $2, $3, $4, $5, $6)`,
      [r.method, r.path, r.status, r.ms, r.m == null ? null : String(r.m), r.response == null ? null : JSON.stringify(r.response)]
    )
    .catch(() => {});
  // Poda ocasional para no crecer sin límite en el plan gratuito.
  if (Math.random() < 0.02) {
    pool.query(`DELETE FROM runtime_log WHERE at < now() - interval '2 days'`).catch(() => {});
  }
}

loadEnv(); // el entry lee el entorno; el handler recibe la config explícita
const handler = createHandler(storage, {
  token: process.env.TOKEN_API_ENTRYPOINT || process.env.TEAM_TOKEN || "",
  onRequest: recordRequest,
});

let ready = null;
function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await storage.ensure();
      await pool.query(
        `CREATE TABLE IF NOT EXISTS runtime_log (
           id bigserial PRIMARY KEY,
           at timestamptz NOT NULL DEFAULT now(),
           method text NOT NULL,
           path text NOT NULL,
           status integer NOT NULL,
           ms integer NOT NULL
         )`
      );
      // Captura de la petición (m) y la respuesta exactas para poder mapear qué
      // envía un cliente y entender cambios desde la petición misma.
      await pool.query(`ALTER TABLE runtime_log ADD COLUMN IF NOT EXISTS m text`);
      await pool.query(`ALTER TABLE runtime_log ADD COLUMN IF NOT EXISTS response jsonb`);
      await pool.query(`CREATE INDEX IF NOT EXISTS runtime_log_at_idx ON runtime_log (at DESC)`);
    })().catch((err) => {
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
/**
 * LAB · Original falso controlable, solo para pruebas de la cadena automática.
 *
 * Reutiliza el handler y el dominio del reemplazo, pero permite cambiar en
 * caliente (POST /api/lab/__lab):
 *   - `e506`: mensaje del error E506.
 *   - `newCommand`: añade un comando nuevo (p.ej. "SALDO") que responde 200.
 *
 * No forma parte del entrypoint oficial; se accede en /api/lab/*.
 */
"use strict";

const { Readable } = require("stream");
const { Pool } = require("pg");
const { createHandler, loadEnv } = require("../../reemplazo/src/server");
const { createPostgresStorage } = require("../../reemplazo/src/storage");
const { json, authorized, readJson } = require("../../monitor/serverless");

let pool = null;
let handler = null;
let storage = null;

function init() {
  if (handler) return;
  loadEnv(); // el entry lee el entorno; el handler recibe la config explícita
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, ssl: { rejectUnauthorized: false } });
  storage = createPostgresStorage(pool, "lab_estado");
  handler = createHandler(storage, { token: process.env.TOKEN_API_ENTRYPOINT || process.env.TEAM_TOKEN || "" });
}

async function ensureConfig() {
  await pool.query(`CREATE TABLE IF NOT EXISTS lab_config (id integer PRIMARY KEY, e506 text NOT NULL, new_command text)`);
  await pool.query(`ALTER TABLE lab_config ADD COLUMN IF NOT EXISTS new_command text`);
  await pool.query(`INSERT INTO lab_config (id, e506) VALUES (1, 'límite excedido') ON CONFLICT (id) DO NOTHING`);
}

async function readConfig() {
  const { rows } = await pool.query("SELECT e506, new_command FROM lab_config WHERE id = 1");
  return rows[0] || { e506: "límite excedido", new_command: null };
}

// Reinyecta el cuerpo ya leído para que el handler real lo vuelva a leer.
function fakeReq(req, buffer) {
  const r = Readable.from([buffer]);
  r.method = req.method;
  r.url = req.url;
  r.headers = req.headers;
  return r;
}

module.exports = async (req, res) => {
  init();
  await storage.ensure();
  await ensureConfig();

  const token = process.env.TOKEN_API_ENTRYPOINT || "";
  const pathname = new URL(req.url, "http://localhost").pathname;

  // --- gestión ---------------------------------------------------------
  if (pathname.endsWith("/__lab")) {
    if (!authorized(req, token)) return json(res, 401, { error: "E001", mensaje: "no autorizado" });
    const payload = await readJson(req, {});
    const e506 = typeof payload.e506 === "string" ? payload.e506 : null;
    const newCommand = typeof payload.newCommand === "string" ? payload.newCommand : null;
    await pool.query(`UPDATE lab_config SET e506 = COALESCE($1, e506), new_command = $2 WHERE id = 1`, [e506, newCommand]);
    return json(res, 200, { ok: true, ...(await readConfig()) });
  }

  const cfg = await readConfig();

  // --- comando nuevo ---------------------------------------------------
  if (req.method === "POST" && pathname.endsWith("/msg")) {
    const payload = await readJson(req, {});
    const m = payload && typeof payload.m === "string" ? payload.m : "";
    if (cfg.new_command && m.split(";")[0].toUpperCase() === cfg.new_command.toUpperCase()) {
      return json(res, 200, { ok: true, comando: cfg.new_command.toUpperCase(), saldo: 0 });
    }
    req = fakeReq(req, Buffer.from(JSON.stringify(payload)));
  }

  // --- override de E506 ------------------------------------------------
  const originalEnd = res.end.bind(res);
  res.end = (chunk, ...args) => {
    if (chunk && cfg.e506 !== "límite excedido") {
      const s = chunk.toString();
      if (s.includes('"E506"')) chunk = s.replace(/"mensaje":\s*"[^"]*"/, `"mensaje":${JSON.stringify(cfg.e506)}`);
    }
    return originalEnd(chunk, ...args);
  };

  // --- delegar ---------------------------------------------------------
  req.url = req.url.replace(/^\/api\/lab/, "") || "/";
  return handler(req, res);
};
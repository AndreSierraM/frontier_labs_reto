/**
 * LAB · Original falso controlable, solo para pruebas de la cadena automática.
 *
 * Igual que el reemplazo (reutiliza su handler y su dominio) pero:
 *   - guarda su estado en la tabla `lab_estado`
 *   - permite cambiar el mensaje de E506 en caliente con POST /api/lab/__lab
 *
 * No forma parte del entrypoint oficial; se accede en /api/lab/*.
 */
"use strict";

const { Pool } = require("pg");
const { createHandler } = require("../../reemplazo/src/server");
const { createPostgresStorage } = require("../../reemplazo/src/storage");

let pool = null;
let handler = null;
let storage = null;

function init() {
  if (handler) return;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, ssl: { rejectUnauthorized: false } });
  storage = createPostgresStorage(pool, "lab_estado");
  handler = createHandler(storage);
}

async function ensureConfig() {
  await pool.query(`CREATE TABLE IF NOT EXISTS lab_config (id integer PRIMARY KEY, e506 text NOT NULL)`);
  await pool.query(
    `INSERT INTO lab_config (id, e506) VALUES (1, 'límite excedido')
     ON CONFLICT (id) DO NOTHING`
  );
}

async function readConfig() {
  const { rows } = await pool.query("SELECT e506 FROM lab_config WHERE id = 1");
  return rows[0] || { e506: "límite excedido" };
}

function authorized(req) {
  const token = process.env.TOKEN_API_ENTRYPOINT || "";
  return token && (req.headers.authorization || "") === `Bearer ${token}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async (req, res) => {
  init();
  await storage.ensure();
  await ensureConfig();

  const pathname = new URL(req.url, "http://localhost").pathname;

  // --- gestión: cambiar el mensaje de E506 -----------------------------
  if (pathname.endsWith("/__lab")) {
    if (!authorized(req)) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ error: "E001", mensaje: "no autorizado" }));
    }
    let payload = {};
    try {
      const raw = await readBody(req);
      if (raw) payload = JSON.parse(raw);
    } catch (_) {}
    const e506 = typeof payload.e506 === "string" ? payload.e506 : "límite excedido";
    await pool.query(
      `INSERT INTO lab_config (id, e506) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET e506 = EXCLUDED.e506`,
      [e506]
    );
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ ok: true, e506 }));
  }

  // --- override de E506 en las respuestas ------------------------------
  const cfg = await readConfig();
  const originalEnd = res.end.bind(res);
  res.end = (chunk, ...args) => {
    if (chunk && cfg.e506 !== "límite excedido") {
      const s = chunk.toString();
      if (s.includes('"E506"')) {
        chunk = s.replace(/"mensaje":\s*"[^"]*"/, `"mensaje":${JSON.stringify(cfg.e506)}`);
      }
    }
    return originalEnd(chunk, ...args);
  };

  // --- delegar al handler real, quitando el prefijo /api/lab -----------
  req.url = req.url.replace(/^\/api\/lab/, "") || "/";
  return handler(req, res);
};
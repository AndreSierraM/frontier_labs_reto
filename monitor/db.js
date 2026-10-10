/**
 * Pool de PostgreSQL compartido por las funciones de monitorización.
 * Reutiliza la conexión entre invocaciones "calientes" de la misma instancia.
 */
"use strict";

const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

module.exports = { getPool };
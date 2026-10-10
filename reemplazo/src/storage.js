/**
 * Persistencia del estado de la caja negra.
 *
 * El dominio (`domain.js`) sigue siendo puro y en memoria; aquí sólo se
 * serializa ese estado hacia distintos backends. Dos adaptadores:
 *
 *   - createMemoryStorage()      estado por proceso (local y tests).
 *   - createPostgresStorage(pool) estado en PostgreSQL (Neon en Vercel),
 *     con lectura/escritura atómica vía transacción.
 *
 * Contrato: `mutate(fn)` entrega (state, xreq), ejecuta `fn` (que muta el
 * estado en memoria) y persiste el resultado; `reset()` vuelve al estado
 * inicial.
 */
"use strict";

const dominio = require("./domain");

// Map -> estructura serializable y viceversa.
function toJSON(state) {
  return {
    cuentas: [...state.cuentas.entries()],
    operaciones: [...state.operaciones.entries()],
    nextCuenta: state.nextCuenta,
    nextOperacion: state.nextOperacion,
  };
}

function fromJSON(o) {
  return {
    cuentas: new Map(o.cuentas),
    operaciones: new Map(o.operaciones),
    nextCuenta: o.nextCuenta,
    nextOperacion: o.nextOperacion,
  };
}

function createMemoryStorage() {
  let state = dominio.freshState();
  let xreq = 0;
  return {
    async mutate(fn) {
      const out = fn(state, xreq);
      xreq = out.xreq;
      return out;
    },
    async reset() {
      state = dominio.freshState();
      xreq = 0;
    },
  };
}

function createPostgresStorage(pool) {
  const UPSERT = `INSERT INTO estado (id, data, xreq, updated_at)
                  VALUES (1, $1, $2, now())
                  ON CONFLICT (id) DO UPDATE
                  SET data = EXCLUDED.data,
                      xreq = EXCLUDED.xreq,
                      updated_at = now()`;

  return {
    async ensure() {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS estado (
           id integer PRIMARY KEY,
           data jsonb NOT NULL,
           xreq integer NOT NULL DEFAULT 0,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`
      );
    },

    async mutate(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          "SELECT data, xreq FROM estado WHERE id = 1 FOR UPDATE"
        );
        const state = rows.length ? fromJSON(rows[0].data) : dominio.freshState();
        const xreq = rows.length ? rows[0].xreq : 0;
        const out = fn(state, xreq);
        await client.query(UPSERT, [JSON.stringify(toJSON(state)), out.xreq]);
        await client.query("COMMIT");
        return out;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async reset() {
      await pool.query(UPSERT, [JSON.stringify(toJSON(dominio.freshState())), 0]);
    },
  };
}

module.exports = { createMemoryStorage, createPostgresStorage, toJSON, fromJSON };
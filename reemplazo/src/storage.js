/**
 * Persistencia del estado de la caja negra.
 *
 * El dominio sigue siendo puro y en memoria. Aquí se serializa hacia distintos
 * backends:
 *
 *   - createMemoryStorage()        estado por proceso (local y tests).
 *   - createPostgresStorage(pool)  estado en PostgreSQL (Neon en Vercel).
 *     Ahora con **caché en memoria + write-behind**: la mayoría de requests
 *     solo tocan memoria; el flush a Postgres es asíncrono.
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
    halted: state.halted || false,
  };
}

function fromJSON(o) {
  return {
    cuentas: new Map(o.cuentas),
    operaciones: new Map(o.operaciones),
    nextCuenta: o.nextCuenta,
    nextOperacion: o.nextOperacion,
    halted: o.halted || false,
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

function createPostgresStorage(pool, table = "estado") {
  const t = String(table).replace(/[^a-zA-Z0-9_]/g, "");

  const SELECT_SQL = `SELECT data, xreq FROM ${t} WHERE id = 1`;
  const UPDATE_SQL = `UPDATE ${t} SET data = $1, xreq = $2, updated_at = now() WHERE id = 1`;
  const INSERT_SQL = `INSERT INTO ${t} (id, data, xreq, updated_at) VALUES (1, $1, $2, now())`;

  // ---------- caché en memoria ----------
  let mem = null;       // estado cacheado
  let memXreq = 0;      // xreq cacheado
  let dirty = false;    // ¿hay cambios sin flush?
  let flushing = false; // ¿hay un flush en vuelo?

  async function flush() {
    if (!dirty || flushing || !mem) return;
    flushing = true;
    dirty = false;
    try {
      await pool.query(UPDATE_SQL, [JSON.stringify(toJSON(mem)), memXreq]);
    } catch (err) {
      dirty = true; // reintentar en el próximo ciclo
    } finally {
      flushing = false;
    }
  }

  // Safety-net: cada 300 ms intentamos vaciar si hay dirty.
  const flushTimer = setInterval(() => {
    if (dirty && !flushing) flush().catch(() => {});
  }, 300);

  // Evitamos que el timer mantenga vivo el proceso en tests locales.
  flushTimer.unref && flushTimer.unref();

  return {
    async ensure() {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${t} (
           id integer PRIMARY KEY,
           data jsonb NOT NULL,
           xreq integer NOT NULL DEFAULT 0,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`
      );
    },

    async mutate(fn) {
      // Lazy-load: solo tocamos Postgres la primera vez (o después de un
      // crash / restart de la instancia serverless).
      if (!mem) {
        const { rows } = await pool.query(SELECT_SQL);
        if (rows.length) {
          mem = fromJSON(rows[0].data);
          memXreq = rows[0].xreq;
        } else {
          mem = dominio.freshState();
          memXreq = 0;
          await pool.query(INSERT_SQL, [JSON.stringify(toJSON(mem)), 0]);
        }
      }

      // La mutación es puramente en memoria y síncrona dentro del event-loop
      // de Node, así que no hay race-conditions intra-proceso.
      const out = fn(mem, memXreq);
      memXreq = out.xreq;
      dirty = true;

      // Disparamos el flush sin await para no bloquear la respuesta HTTP.
      flush().catch(() => {});

      return out;
    },

    async reset() {
      mem = dominio.freshState();
      memXreq = 0;
      dirty = false;
      await pool.query(UPDATE_SQL, [JSON.stringify(toJSON(mem)), 0]);
    },

    // Expuesto para tests / diagnóstico.
    _flush: flush,
    _cached: () => ({ state: mem, xreq: memXreq, dirty }),
  };
}

module.exports = { createMemoryStorage, createPostgresStorage, toJSON, fromJSON };
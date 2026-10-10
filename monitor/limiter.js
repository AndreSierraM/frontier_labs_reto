/**
 * Rate-limiter global para observación del servicio original.
 *
 * Interfaz pequeña: { acquire, reset, rps, minGapMs }.
 * La lógica de "esperar al siguiente hueco" está encapsulada aquí;
 * observe.js solo consume acquire().
 */
"use strict";

const RPS = Math.max(1, Number(process.env.MONITOR_RPS || 8));
const MIN_GAP_MS = Math.ceil(1000 / RPS);
const BACKOFF_MS = Math.max(0, Number(process.env.MONITOR_BACKOFF_MS || 2000));
let nextSlot = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquire() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

function reset() {
  nextSlot = 0;
}

module.exports = {
  acquire,
  reset,
  rps: RPS,
  minGapMs: MIN_GAP_MS,
  backoffMs: BACKOFF_MS,
};

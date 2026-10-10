#!/usr/bin/env node
/**
 * Entrypoint del enjambre. Toda la lógica vive en `pipeline.mjs`; aquí solo se
 * ejecuta y se traduce el estado a un código de salida.
 *
 *   node agent/swarm.mjs             # corre el enjambre
 *   node agent/swarm.mjs --dry-run   # solo muestra el plan
 */
import { runSwarm } from "./pipeline.mjs";

// Estados operacionales del pipeline: no son errores técnicos del CI.
const OK_STATUSES = new Set([
  "no-change",
  "dry-run",
  "no-patch",
  "inconclusive",
  "needs-review",
  "failed",
  "done",
]);

runSwarm()
  .then((r) => {
    if (OK_STATUSES.has(r.status)) {
      console.log("[swarm] terminó con estado:", r.status);
      process.exit(0);
    }
    console.error("[swarm] estado inesperado:", r.status);
    process.exit(1);
  })
  .catch((e) => {
    console.error("[swarm] error técnico:", e.message);
    process.exit(1);
  });
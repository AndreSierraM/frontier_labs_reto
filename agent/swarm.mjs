#!/usr/bin/env node
/**
 * Entrypoint del enjambre. Toda la lógica vive en `pipeline.mjs`; aquí solo se
 * ejecuta y se traduce el estado a un código de salida.
 *
 *   node agent/swarm.mjs             # corre el enjambre
 *   node agent/swarm.mjs --dry-run   # solo muestra el plan
 */
import { runSwarm } from "./pipeline.mjs";

runSwarm()
  .then((r) => process.exit(r.status === "failed" ? 1 : 0))
  .catch((e) => {
    console.error("[swarm] error:", e.message);
    process.exit(1);
  });
/**
 * Una fase del pipeline = un agente con su rol + su tarea, guardando el
 * informe como artefacto de la corrida.
 */
import { runPi } from "./pi.mjs";
import { readRole } from "./roles.mjs";
import { save } from "./runstate.mjs";
import { config } from "./config.mjs";

export async function runPhase({ role, task, label, runDir, file }) {
  const r = await runPi({ system: readRole(role), task, cwd: config.root, label });
  if (file) save(runDir, file, r.out || "(sin salida)");
  return r;
}
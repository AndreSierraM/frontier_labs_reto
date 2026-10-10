/**
 * Cliente del monitor: cambios pendientes y ack.
 */
import fs from "node:fs";
import { config } from "./config.mjs";
import kinds from "../../monitor/kinds.js";

async function api(pathname, options = {}) {
  const res = await fetch(config.monitorUrl + pathname, {
    ...options,
    headers: { Authorization: "Bearer " + config.monitorToken, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}`);
  return text ? JSON.parse(text) : null;
}

/** Eventos de cambio posteriores al último `adaptation_applied`. */
export function pendingChanges(events) {
  const acks = (events || []).filter((e) => e.kind === "adaptation_applied").map((e) => e.id);
  const lastAck = acks.length ? Math.max(...acks) : 0;
  return (events || []).filter((e) => kinds.wakesSwarm(e.kind) && e.id > lastAck);
}

/** Cambios a adaptar: de un archivo local (pruebas) o del monitor. */
export async function fetchChanges() {
  if (config.changesFile) {
    const raw = JSON.parse(fs.readFileSync(config.changesFile, "utf8"));
    return Array.isArray(raw) ? raw : [raw];
  }
  if (!config.monitorToken) throw new Error("falta MONITOR_TOKEN (o usa SWARM_CHANGES_FILE)");
  const st = await api("/api/monitor/status");
  return pendingChanges(st.events);
}

export async function ack(labels) {
  if (config.changesFile) return; // modo local: no toca el monitor
  await api("/api/monitor/ack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: labels.join(",") }),
  });
}

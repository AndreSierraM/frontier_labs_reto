#!/usr/bin/env node
/**
 * Harness de adaptación.
 *
 * Toma el cambio detectado por el monitor, lanza `pi` en modo headless para
 * analizar/reproducir/parchear el reemplazo, corre los tests y marca el evento
 * como atendido. Pensado para correr dentro del repo (local o GitHub Actions).
 *
 *   node agent/adapt.mjs            # analiza y adapta
 *   node agent/adapt.mjs --dry-run  # solo muestra la evidencia
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MONITOR_URL = (process.env.MONITOR_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, "");
const MONITOR_TOKEN = process.env.MONITOR_TOKEN || "";
const DRY = process.argv.includes("--dry-run");

function log(...a) {
  console.log("[adapt]", ...a);
}

async function monitorFetch(pathname, options = {}) {
  const res = await fetch(MONITOR_URL + pathname, {
    ...options,
    headers: { Authorization: "Bearer " + MONITOR_TOKEN, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

/** Primer `original_changed` posterior al último `adaptation_applied`. */
function pendingChange(events) {
  const acks = (events || []).filter((e) => e.kind === "adaptation_applied").map((e) => e.id);
  const lastAck = acks.length ? Math.max(...acks) : 0;
  return (events || []).find((e) => e.kind === "original_changed" && e.id > lastAck) || null;
}

function buildTask(ev) {
  return [
    "El monitor detectó un cambio en el servicio original.",
    "",
    `Etiqueta: ${ev.label}`,
    `Antes: ${JSON.stringify(ev.before)}`,
    `Ahora: ${JSON.stringify(ev.after)}`,
    `Detectado: ${ev.detected_at}`,
    `Mensaje: ${ev.message || "(sin mensaje)"}`,
    "",
    "Adapta el reemplazo siguiendo el procedimiento del system prompt.",
  ].join("\n");
}

function runPi(task) {
  const system = fs.readFileSync(path.join(__dirname, "PROMPT.md"), "utf8");
  log("lanzando `pi --print` ...");
  const res = spawnSync("pi", ["--print", "--append-system-prompt", system, task], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (res.error) throw res.error;
  return res.status || 0;
}

function runTests() {
  log("npm --prefix reemplazo test");
  const res = spawnSync("npm", ["--prefix", "reemplazo", "test"], { cwd: ROOT, stdio: "inherit" });
  if (res.error) throw res.error;
  return res.status || 0;
}

async function ack(ev) {
  try {
    await monitorFetch("/api/monitor/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: ev.label }),
    });
    log("evento marcado como atendido");
  } catch (e) {
    log("aviso: no se pudo marcar el evento:", e.message);
  }
}

(async () => {
  if (!MONITOR_TOKEN) {
    console.error("[adapt] falta MONITOR_TOKEN");
    process.exit(2);
  }

  const status = await monitorFetch("/api/monitor/status");
  const ev = pendingChange(status.events);
  if (!ev) {
    log("sin cambios pendientes");
    return;
  }

  fs.writeFileSync(path.join(__dirname, "evidence.json"), JSON.stringify(ev, null, 2));
  log(`cambio pendiente: ${ev.label} -> ${JSON.stringify(ev.after)}`);

  if (DRY) {
    log("dry-run: no se invoca pi");
    return;
  }

  const piStatus = runPi(buildTask(ev));
  if (piStatus !== 0) {
    console.error("[adapt] pi terminó con", piStatus);
    process.exit(piStatus);
  }

  const testStatus = runTests();
  if (testStatus !== 0) {
    console.error("[adapt] tests fallaron: no se marca el evento");
    process.exit(testStatus);
  }

  await ack(ev);
  log("OK: cambios aplicados y tests verdes");
})();
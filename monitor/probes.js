/**
 * Mapeo ampliado del original: además de la batería de 31 puntos, descubre
 * comportamientos NUEVOS (comandos, rutas, montos y controles nuevos).
 *
 * Se ejecuta en GitHub Actions (sin el límite de 60s de Vercel) y su mapa se
 * guarda/compara vía `/api/monitor/map`. Cualquier valor nuevo o cambiado es
 * una señal que despierta al enjambre.
 */
"use strict";

const dominio = require("../reemplazo/src/domain");
const { BATERIA, request } = require("./battery");

const c = (body) => `${body};${dominio.control(body)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Candidatos a comandos nuevos: si alguno NO responde E301, es novedad.
const COMANDOS_CANDIDATOS = [
  "SALDO", "SALDOS", "EXTRACTO", "MOVIMIENTOS", "LISTA", "BAJA", "CIERRA",
  "RETIRA", "RETIRO", "DEPOSITAR", "TRANSFERIR", "CANCELA", "REVERSA",
  "ANULAR", "HISTORIAL", "INFO", "STATUS", "AYUDA", "HELP", "VERSION",
  "ECO", "PING2", "SET", "GET", "QUERY", "ORDEN", "PAGO", "COBRO",
];

// Montos de borde (válidos e inválidos).
const MONTOS = [
  "0", "1", "9", "10", "999999999", "1000000000", "10000000000",
  "0001", "+1", "1.5", "-1", "1e3", " 1", "1 ", "99999999999999999999",
];

// Valores de control de borde.
const CONTROLES = ["0", "00", "2", "98", "003", "+3", "3abc", " ", "999"];

// Rutas y métodos candidatos (descubrir endpoints nuevos).
const RUTAS = [
  ["GET", "/"],
  ["GET", "/favicon.ico"],
  ["GET", "/robots.txt"],
  ["GET", "/metrics"],
  ["GET", "/debug"],
  ["GET", "/admin"],
  ["GET", "/status"],
  ["GET", "/version"],
  ["GET", "/api"],
  ["GET", "/openapi.json"],
  ["GET", "/msg/"],
  ["GET", "/health/"],
  ["GET", "/__reset/"],
  ["PUT", "/msg"],
  ["DELETE", "/msg"],
  ["PATCH", "/msg"],
  ["OPTIONS", "/msg"],
  ["POST", "/health"],
];

function buildMsgProbes() {
  const probes = [...BATERIA];
  for (const cmd of COMANDOS_CANDIDATOS) probes.push([`cmd:${cmd}`, c(`${cmd};x`)]);
  for (const m of MONTOS) probes.push([`monto:${m}`, c(`DEPOSITO;AC-0001;${m}`)]);
  for (const ctl of CONTROLES) probes.push([`ctl:${ctl}`, `ALTA;Mateo;${ctl}`]);
  return probes;
}

const MSG_PROBES = buildMsgProbes();

async function runProbes(base, token, { sleepMs = 50, timeoutMs = 15000, abortOnInfra = true } = {}) {
  const map = {};
  for (const [label, m] of MSG_PROBES) {
    const sample = m === null
      ? await request(base, token, "/__reset", null, timeoutMs)
      : await request(base, token, "/msg", { m }, timeoutMs);
    map[label] = m === null && sample.status === 200 ? { status: 200, response: "reset" } : sample;
    if (abortOnInfra && (sample.status === 429 || sample.status === 0)) return map;
    if (sleepMs) await sleep(sleepMs);
  }
  for (const [method, path] of RUTAS) {
    const sample = await request(base, token, method, path, null, timeoutMs);
    map[`route:${method}:${path}`] = sample;
    if (abortOnInfra && (sample.status === 429 || sample.status === 0)) return map;
    if (sleepMs) await sleep(sleepMs);
  }
  return map;
}

/** Diferencia un mapa previo contra uno nuevo: cambios, agregados y removidos. */
function diffMap(prev, next) {
  const { stable } = require("./battery");
  const added = [];
  const changed = [];
  for (const label of Object.keys(next)) {
    if (!(label in (prev || {}))) added.push(label);
    else if (stable(prev[label]) !== stable(next[label])) changed.push(label);
  }
  const removed = Object.keys(prev || {}).filter((l) => !(l in next));
  return { added, changed, removed, total: Object.keys(next).length };
}

module.exports = { MSG_PROBES, RUTAS, runProbes, diffMap, COMANDOS_CANDIDATOS };
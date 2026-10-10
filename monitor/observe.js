/**
 * Observación del original: sondas, ejecución y comparación.
 *
 * Una sola fuente para lo que antes eran `battery.js` (batería de 31 puntos) y
 * `probes.js` (descubrimiento). Todo se modela como una lista uniforme de
 * sondas `{label, method, path, body}` y un único runner/diff.
 *
 *   PROBES.battery     -> batería de contrato/estado (rápida, para serverless)
 *   PROBES.discovery   -> comandos/rutas/montos candidatos (descubre novedades)
 *   PROBES.all         -> todas (para el recon en GitHub Actions)
 */
"use strict";

const crypto = require("crypto");
const dominio = require("../reemplazo/src/domain");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = (body) => `${body};${dominio.control(body)}`;

// ---------------------------------------------------------------- HTTP
async function requestRaw(base, token, method, path, body, timeoutMs = 15000, tries = 2) {
  let lastErr = "";
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(base + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        parsed = text;
      }
      if (res.status === 429 && i < tries - 1) {
        await sleep(1000 * (i + 1));
        continue;
      }
      return { status: res.status, response: parsed };
    } catch (e) {
      lastErr = String(e && e.message);
      await sleep(1000 * (i + 1));
    }
  }
  return { status: 0, response: "unreachable", error: lastErr };
}
const request = (base, token, path, body, timeoutMs, tries) =>
  requestRaw(base, token, "POST", path, body, timeoutMs, tries);

// ---------------------------------------------------------------- sondas
const BATERIA = [
  ["reset", null],
  ["PING", "PING;64"],
  ["PING-ignore", "PING;abc"],
  ["E103", "PING"],
  ["E104", "PING;"],
  ["E201", "ALTA;Mateo;003"],
  ["E202", "ALTA;Mateo;03"],
  ["E301", c("SALDOS;x")],
  ["E301-sug", c("TRANSFERIR;x")],
  ["ALTA", c("ALTA;A")],
  ["ALTA2", c("ALTA;B")],
  ["CONSULTA", c("CONSULTA;AC-0001")],
  ["DEPOSITO", c("DEPOSITO;AC-0001;100")],
  ["SALDO", c("CONSULTA;AC-0001")],
  ["T-ok", c("TRANSFER;AC-0001;AC-0002;50")],
  ["T-limite", c("TRANSFER;AC-0001;AC-0002;100001")],
  ["T-saldo", c("TRANSFER;AC-0001;AC-0002;101")],
  ["T-mismo", c("TRANSFER;AC-0001;AC-0001;10")],
  ["T-inexistente", c("TRANSFER;AC-0001;AC-9999;10")],
  ["T-monto", c("TRANSFER;AC-0001;AC-0002;0")],
  ["ANULA-op", c("DEPOSITO;AC-0001;1")],
  ["ANULA", c("ANULA;OP-0001")],
  ["E402", c("ANULA;OP-9999")],
  ["reset2", null],
  ["bloqueo-1", c("ALTA;A")],
  ["bloqueo-2", c("ALTA;B")],
  ["bloqueo-3", c("DEPOSITO;AC-0001;100")],
  ["falta1", c("TRANSFER;AC-0001;AC-0002;101")],
  ["falta2", c("TRANSFER;AC-0001;AC-0002;101")],
  ["falta3", c("TRANSFER;AC-0001;AC-0002;101")],
  ["E510", c("TRANSFER;AC-0001;AC-0002;101")],
];

// Candidatos a comandos nuevos: si alguno NO responde E301, es novedad.
const COMANDOS_CANDIDATOS = [
  "SALDO", "SALDOS", "EXTRACTO", "MOVIMIENTOS", "LISTA", "BAJA", "CIERRA",
  "RETIRA", "RETIRO", "DEPOSITAR", "TRANSFERIR", "CANCELA", "REVERSA",
  "ANULAR", "HISTORIAL", "INFO", "STATUS", "AYUDA", "HELP", "VERSION",
  "ECO", "PING2", "SET", "GET", "QUERY", "ORDEN", "PAGO", "COBRO",
];

// Montos y controles de borde.
const MONTOS = [
  "0", "1", "9", "10", "999999999", "1000000000", "10000000000",
  "0001", "+1", "1.5", "-1", "1e3", " 1", "1 ", "99999999999999999999",
];
const CONTROLES = ["0", "00", "2", "98", "003", "+3", "3abc", " ", "999"];

// Rutas y métodos candidatos (descubrir endpoints nuevos).
const RUTAS = [
  ["GET", "/"], ["GET", "/favicon.ico"], ["GET", "/robots.txt"],
  ["GET", "/metrics"], ["GET", "/debug"], ["GET", "/admin"],
  ["GET", "/status"], ["GET", "/version"], ["GET", "/api"],
  ["GET", "/openapi.json"], ["GET", "/msg/"], ["GET", "/health/"],
  ["GET", "/__reset/"], ["PUT", "/msg"], ["DELETE", "/msg"],
  ["PATCH", "/msg"], ["OPTIONS", "/msg"], ["POST", "/health"],
];

function buildProbes() {
  const battery = BATERIA.map(([label, m]) => ({
    label,
    method: "POST",
    path: m === null ? "/__reset" : "/msg",
    body: m === null ? null : { m },
  }));
  const discovery = [
    ...COMANDOS_CANDIDATOS.map((cmd) => ({ label: `cmd:${cmd}`, method: "POST", path: "/msg", body: { m: c(`${cmd};x`) } })),
    ...MONTOS.map((m) => ({ label: `monto:${m}`, method: "POST", path: "/msg", body: { m: c(`DEPOSITO;AC-0001;${m}`) } })),
    ...CONTROLES.map((ctl) => ({ label: `ctl:${ctl}`, method: "POST", path: "/msg", body: { m: `ALTA;Mateo;${ctl}` } })),
  ];
  const routes = RUTAS.map(([method, path]) => ({ label: `route:${method}:${path}`, method, path }));
  return { battery, discovery, routes, all: [...battery, ...discovery, ...routes] };
}
const PROBES = buildProbes();

// ---------------------------------------------------------------- runner
async function run(base, token, list, { sleepMs = 40, timeoutMs = 15000, tries = 2, abortOnInfra = false } = {}) {
  const map = {};
  for (const p of list) {
    const raw = await requestRaw(base, token, p.method, p.path, p.body, timeoutMs, tries);
    map[p.label] = p.path === "/__reset" && raw.status === 200 ? { status: 200, response: "reset" } : raw;
    // Al primer 429/inaccesible la muestra ya no sirve: abortar rápido.
    if (abortOnInfra && (raw.status === 429 || raw.status === 0)) return map;
    if (sleepMs) await sleep(sleepMs);
  }
  return map;
}
const runBattery = (base, token, opts) => run(base, token, PROBES.battery, { sleepMs: 100, timeoutMs: 20000, ...opts });
const runAll = (base, token, opts) => run(base, token, PROBES.all, { sleepMs: 40, ...opts });

async function health(base, token, timeoutMs = 15000) {
  try {
    const res = await fetch(base + "/health", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: res.status === 200, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e && e.message) };
  }
}

// -------------------------------------------------- comparación / hashing
// Postgres jsonb no preserva el orden de claves: comparar/hashear exige una
// forma canónica para no reportar falsos cambios.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}
const stable = (value) => JSON.stringify(canonical(value));
const fingerprint = (map) => crypto.createHash("sha256").update(stable(map)).digest("hex");

function hasInfra(map) {
  return Object.values(map || {}).some((s) => s && (s.status === 429 || s.status === 0));
}

/** Diferencia dos mapas: agregados, cambiados, removidos y la lista de diffs. */
function diff(prev, next) {
  const added = [];
  const changed = [];
  const diffs = [];
  for (const label of Object.keys(next || {})) {
    if (!(label in (prev || {}))) {
      added.push(label);
      diffs.push({ label, before: null, after: next[label] });
    } else if (stable(prev[label]) !== stable(next[label])) {
      changed.push(label);
      diffs.push({ label, before: prev[label], after: next[label] });
    }
  }
  const removed = Object.keys(prev || {}).filter((l) => !(l in (next || {})));
  return { added, changed, removed, diffs };
}

module.exports = {
  PROBES,
  request,
  requestRaw,
  run,
  runBattery,
  runAll,
  health,
  canonical,
  stable,
  fingerprint,
  hasInfra,
  diff,
};
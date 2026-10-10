/**
 * Observación del original: ejecución de sondas y comparación.
 *
 * Las sondas (datos) viven en `probes.js`; aquí está la lógica: HTTP, runner,
 * health, diff, fingerprint e infra. Una sola implementación para la batería y
 * el mapa.
 */
"use strict";

const crypto = require("crypto");
const probes = require("./probes");

const PROBES = probes.catalog();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// ---------------------------------------------------------------- runner
async function run(base, token, list, { sleepMs = 40, timeoutMs = 15000, tries = 2, abortOnInfra = false, concurrency = 1 } = {}) {
  const map = {};
  const record = (p, raw) => {
    map[p.label] = p.path === "/__reset" && raw.status === 200 ? { status: 200, response: "reset" } : raw;
  };
  const infra = (raw) => abortOnInfra && (raw.status === 429 || raw.status === 0);

  // Secuencial: obligatorio para la batería (tiene estado).
  if (concurrency <= 1) {
    for (const p of list) {
      const raw = await requestRaw(base, token, p.method, p.path, p.body, timeoutMs, tries);
      record(p, raw);
      if (infra(raw)) return map; // al primer 429 la muestra ya no sirve
      if (sleepMs) await sleep(sleepMs);
    }
    return map;
  }

  // Concurrente (pool): para sondas independientes (descubrimiento/rutas).
  let next = 0;
  let aborted = false;
  const worker = async () => {
    while (next < list.length && !aborted) {
      const p = list[next++];
      const raw = await requestRaw(base, token, p.method, p.path, p.body, timeoutMs, tries);
      record(p, raw);
      if (infra(raw)) aborted = true;
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return map;
}

const runBattery = (base, token, opts) => run(base, token, PROBES.battery, { sleepMs: 50, timeoutMs: 20000, ...opts, concurrency: 1 });

// Batería secuencial (estado) + descubrimiento/rutas en paralelo (sin estado).
async function runAll(base, token, opts = {}) {
  const battery = await runBattery(base, token, opts);
  if (opts.abortOnInfra && hasInfra(battery)) return battery;
  const rest = await run(base, token, [...PROBES.discovery, ...PROBES.routes], {
    sleepMs: 0,
    ...opts,
    concurrency: opts.concurrency || 6,
  });
  return { ...battery, ...rest };
}

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

module.exports = { PROBES, request, requestRaw, run, runBattery, runAll, health, canonical, stable, fingerprint, hasInfra, diff };
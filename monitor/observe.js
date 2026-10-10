/**
 * Observación del original: ejecución de sondas y comparación.
 *
 * Las sondas (datos) viven en `probes.js`; aquí está la lógica: HTTP, runner,
 * health. El rate-limiter vive en `limiter.js`; la comparación pura en
 * `compare.js`.
 */
"use strict";

const probes = require("./probes");
const limiter = require("./limiter");
const compare = require("./compare");
const { hasInfra, withoutInfra, fingerprint } = compare;

const PROBES = probes.catalog();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- HTTP
async function requestRaw(base, token, method, path, body, timeoutMs = 15000, tries = 3, throttle = true) {
  let lastErr = "";
  for (let i = 0; i < tries; i++) {
    if (throttle) await limiter.acquire();
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
      const infra = res.status === 429 || res.headers.get("x-frontier-infra") === "rate-limit";
      if (infra && i < tries - 1) {
        await sleep(limiter.backoffMs * (i + 1));
        continue;
      }
      return { status: res.status, response: parsed };
    } catch (e) {
      lastErr = String(e && e.message);
      await sleep(limiter.backoffMs * (i + 1));
    }
  }
  return { status: 0, response: "unreachable", error: lastErr };
}
const request = (base, token, path, body, timeoutMs, tries, throttle) =>
  requestRaw(base, token, "POST", path, body, timeoutMs, tries, throttle);

// ---------------------------------------------------------------- runner
async function run(
  base,
  token,
  list,
  {
    sleepMs = 40,
    timeoutMs = 15000,
    tries = 2,
    abortOnInfra = false,
    concurrency = 1,
    throttle = true,
    infraRetries = 1,
    infraWaitMs = 3000,
    infraAbortAfter = 3,
  } = {}
) {
  const map = {};
  const record = (p, raw) => {
    map[p.label] = p.path === "/__reset" && raw.status === 200 ? { status: 200, response: "reset" } : raw;
  };
  const isInfra = (raw) => raw.status === 429 || raw.status === 0;
  let infraRun = 0;

  // Repite la sonda si topa con rate-limit, para tolerar 429 intermitentes.
  const probe = async (p) => {
    let raw = await requestRaw(base, token, p.method, p.path, p.body, timeoutMs, tries, throttle);
    for (let n = 0; n < infraRetries && isInfra(raw); n++) {
      await sleep(infraWaitMs * (n + 1));
      raw = await requestRaw(base, token, p.method, p.path, p.body, timeoutMs, tries, throttle);
    }
    return raw;
  };
  // Aborta solo si el original está limitado de forma persistente (no puntual):
  // así un 429 aislado no descarta toda la observación.
  const stop = (raw) => {
    if (!isInfra(raw)) {
      infraRun = 0;
      return false;
    }
    infraRun += 1;
    return abortOnInfra || infraRun >= infraAbortAfter;
  };

  // Secuencial: obligatorio para la batería (tiene estado).
  if (concurrency <= 1) {
    for (const p of list) {
      const raw = await probe(p);
      record(p, raw);
      if (stop(raw)) return map;
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
      const raw = await probe(p);
      record(p, raw);
      if (stop(raw)) aborted = true;
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return map;
}

const runBattery = (base, token, opts) => run(base, token, PROBES.battery, { sleepMs: 50, timeoutMs: 20000, ...opts, concurrency: 1 });

// Clave del catálogo de sondas: si cambia, el monitor RE-BASELINA (evita falsos
// "cambios" por sondas nuevas o por corrimiento del contador de operaciones).
const catalogKey = () => fingerprint(PROBES.all.map((p) => [p.label, p.method, p.path, p.body]));

// Batería secuencial (estado) + descubrimiento (sin estado).
async function runAll(base, token, opts = {}) {
  const battery = await runBattery(base, token, opts);
  // Si la batería no obtuvo NINGUNA muestra válida, el original está caído:
  // no tiene sentido gastar el descubrimiento.
  if (hasInfra(battery) && Object.keys(withoutInfra(battery)).length === 0) return battery;
  // Reset antes del descubrimiento: sus sondas crean operaciones, así que sin
  // reset el contador OP-* dependería de la batería y cambiar la batería
  // falsearía el mapa.
  await requestRaw(base, token, "POST", "/__reset", null, opts.timeoutMs || 15000, 1, opts.throttle !== false);
  const rest = await run(base, token, [...PROBES.discovery, ...PROBES.routes], {
    sleepMs: 0,
    ...opts,
    concurrency: opts.concurrency || 1,
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

module.exports = { PROBES, catalogKey, request, requestRaw, run, runBattery, runAll, health, limiter, ...compare };
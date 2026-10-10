/**
 * Observación del original: ejecución de sondas y comparación.
 *
 * Las sondas (datos) viven en `probes.js`; aquí está la lógica: HTTP, runner,
 * health, diff, fingerprint e infra. Una sola implementación para la batería y
 * el mapa.
 */
"use strict";

const probes = require("./probes");
const compare = require("./compare");
const { hasInfra, withoutInfra } = compare;

const PROBES = probes.catalog();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- rate limit
// Material oficial (`frontier-reto-2/README.md`): cada token admite 10 req/s y
// 8.000/día. Si se supera, el original responde 429 con `X-Frontier-Infra`.
// Serializamos TODAS las peticiones con un limitador global por debajo del
// límite (8 rps por defecto) para no autobloquearnos.
const RPS = Math.max(1, Number(process.env.MONITOR_RPS || 8));
const MIN_GAP_MS = Math.ceil(1000 / RPS);
const BACKOFF_MS = Math.max(0, Number(process.env.MONITOR_BACKOFF_MS || 2000));
let nextSlot = 0;

/** Reserva el siguiente hueco del limitador y espera si aún no toca. */
async function acquire() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

const limiter = {
  rps: RPS,
  minGapMs: MIN_GAP_MS,
  acquire,
  reset: () => {
    nextSlot = 0;
  },
};

// ---------------------------------------------------------------- HTTP
async function requestRaw(base, token, method, path, body, timeoutMs = 15000, tries = 3, throttle = true) {
  let lastErr = "";
  for (let i = 0; i < tries; i++) {
    if (throttle) await acquire();
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
        await sleep(BACKOFF_MS * (i + 1));
        continue;
      }
      return { status: res.status, response: parsed };
    } catch (e) {
      lastErr = String(e && e.message);
      await sleep(BACKOFF_MS * (i + 1));
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

// Batería secuencial (estado) + descubrimiento/rutas en paralelo (sin estado).
async function runAll(base, token, opts = {}) {
  const battery = await runBattery(base, token, opts);
  // Si la batería no obtuvo NINGUNA muestra válida, el original está caído:
  // no tiene sentido gastar el descubrimiento.
  if (hasInfra(battery) && Object.keys(withoutInfra(battery)).length === 0) return battery;
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

module.exports = { PROBES, request, requestRaw, run, runBattery, runAll, health, limiter, ...compare };
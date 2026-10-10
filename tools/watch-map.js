#!/usr/bin/env node
/**
 * Vigilante + escáner privado (no toca el monitor ni el enjambre).
 *
 * 1. Sondea `POST /msg` cada `WATCH_POLL_MS` (60 s por defecto).
 * 2. En cuanto el original deja de responder 429/0:
 *      Fase 1: descubrimiento ampliado (comandos + rutas)   -> endpoints nuevos
 *      Fase 2: batería con estado (observe.PROBES.battery)  -> comportamiento
 *    sobre el ORIGINAL y sobre NUESTRO reemplazo (v1), y guarda:
 *      - map-<ts>.json    : mapa crudo del original
 *      - report-<ts>.json : diff v1(reemplazo) vs original  -> QUÉ CAMBIÓ
 *
 * No postea a `/api/monitor/*` ni dispara el enjambre.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const observe = require("../monitor/observe.js");
const compare = require("../monitor/compare.js");
const probes = require("../monitor/probes.js");
const scan = require("./scan-probes.js");

const URL = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
const TOKEN = process.env.TOKEN_CAJA_NEGRA || "";
const REPL_URL = (process.env.REPL_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, "");
const REPL_TOKEN = process.env.REPL_TOKEN || "";
const POLL_MS = Number(process.env.WATCH_POLL_MS || 60000);
const MAP_EVERY_MS = Number(process.env.WATCH_MAP_EVERY_MS || 1800000);
const OUT = path.resolve(__dirname, "../reto2-investigacion/logs/watch-map");
const LOG = path.join(OUT, "watch.log");

if (!URL || !TOKEN) {
  console.error("[watch-map] faltan URL_API_ENTRYPOINT / TOKEN_CAJA_NEGRA");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const stamp = () => new Date().toISOString();
const log = (m) => {
  const line = `[${stamp()}] ${m}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG, line + "\n");
  } catch (_) {}
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe() {
  try {
    const r = await fetch(URL + "/msg", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ m: "PING;abc" }),
      signal: AbortSignal.timeout(10000),
    });
    return r.status;
  } catch (e) {
    return 0;
  }
}

// Lista completa: batería (estado) primero y descubrimiento ampliado después.
function fullList() {
  return [...observe.PROBES.battery, ...scan.catalog().discovery];
}

function endpointsFound(origMap) {
  const cmdNew = [];
  const routeNew = [];
  for (const [label, s] of Object.entries(origMap)) {
    if (!s || !s.response) continue;
    if (label.startsWith("cmd:") && s.response.error !== "E301") cmdNew.push(`${label}=${JSON.stringify(s.response)}`);
    if (label.startsWith("route:") && s.status !== 404) routeNew.push(`${label}=${s.status} ${JSON.stringify(s.response)}`);
  }
  return { cmdNew, routeNew };
}

async function mapBoth() {
  const ts = stamp().replace(/[:.]/g, "-");
  const list = fullList();

  log(`Fase 1+2 · ${list.length} sondas contra el ORIGINAL`);
  const orig = await observe.run(URL, TOKEN, list, { sleepMs: 0, concurrency: 1, throttle: true, infraRetries: 1, infraAbortAfter: 3 });
  const origValid = compare.withoutInfra(orig);
  fs.writeFileSync(path.join(OUT, `map-${ts}.json`), JSON.stringify({ at: stamp(), url: URL, total: Object.keys(orig).length, valid: Object.keys(origValid).length, map: orig }, null, 2));
  log(`mapa original: ${Object.keys(origValid).length}/${Object.keys(orig).length} válidas -> map-${ts}.json`);

  const { cmdNew, routeNew } = endpointsFound(orig);
  if (cmdNew.length) log(`COMANDOS que EXISTEN (resp != E301): ${cmdNew.join(" | ")}`);
  if (routeNew.length) log(`RUTAS que EXISTEN (resp != 404): ${routeNew.join(" | ")}`);

  let replMap = {};
  if (REPL_TOKEN) {
    log(`Fase 1+2 · ${list.length} sondas contra el REEMPLAZO (v1)`);
    replMap = await observe.run(REPL_URL, REPL_TOKEN, list, { sleepMs: 0, concurrency: 1, throttle: false, infraRetries: 0 });
  } else {
    log("sin REPL_TOKEN: no se compara contra el reemplazo");
  }

  const d = compare.diff(compare.withoutInfra(replMap), origValid);
  fs.writeFileSync(
    path.join(OUT, `report-${ts}.json`),
    JSON.stringify({ at: stamp(), original: URL, replacement: REPL_URL, changedLabels: d.changed, added: d.added, removed: d.removed, diffs: d.diffs, cmdNew, routeNew }, null, 2)
  );
  log(`DIFF v1 vs original: ${d.changed.length} cambiados, ${d.added.length} nuevos, ${d.removed.length} removidos -> report-${ts}.json`);
  for (const x of [...d.diffs, ...d.added.map((l) => ({ label: l, before: null, after: origValid[l] }))].slice(0, 60)) {
    log(`  · ${x.label}: v1=${JSON.stringify(x.before)} -> original=${JSON.stringify(x.after)}`);
  }
}

(async () => {
  log(`vigilante-escáner iniciado · poll ${POLL_MS} ms · rps ${observe.limiter.rps} · sondas ${fullList().length}`);
  for (;;) {
    const s = await probe();
    if (s !== 429 && s !== 0) {
      log(`original LIBERADO (probe=${s}): escaneando`);
      try {
        await mapBoth();
      } catch (e) {
        log("error escaneando: " + (e && e.message));
      }
      await sleep(MAP_EVERY_MS);
    } else {
      log(`bloqueado (probe=${s}); reintento en ${POLL_MS} ms`);
      await sleep(POLL_MS);
    }
  }
})();

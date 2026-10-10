#!/usr/bin/env node
/**
 * Escaneo ÚNICO (original vs reemplazo) con el catálogo ampliado.
 * A ritmo bajo (limitador 8 rps) para no disparar el rate-limit.
 * No toca el monitor ni el enjambre.
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
const OUT = path.resolve(__dirname, "../reto2-investigacion/logs/watch-map");

const list = [...probes.catalog().battery, ...scan.catalog().discovery];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ts = new Date().toISOString();
  console.error(`[scan] ${list.length} sondas contra el ORIGINAL (rps=${observe.limiter.rps})`);
  const orig = await observe.run(URL, TOKEN, list, { sleepMs: 0, concurrency: 1, throttle: true, infraRetries: 1, infraAbortAfter: 3 });
  const origValid = compare.withoutInfra(orig);
  console.error(`[scan] original: ${Object.keys(origValid).length}/${Object.keys(orig).length} válidas`);

  let repl = {};
  if (REPL_TOKEN) {
    console.error(`[scan] ${list.length} sondas contra el REEMPLAZO (v1)`);
    repl = await observe.run(REPL_URL, REPL_TOKEN, list, { sleepMs: 0, concurrency: 1, throttle: false, infraRetries: 0 });
  }

  const d = compare.diff(compare.withoutInfra(repl), origValid);
  const cmdNew = [];
  const routeNew = [];
  for (const [label, s] of Object.entries(origValid)) {
    if (!s || !s.response) continue;
    if (label.startsWith("cmd:") && s.response.error !== "E301") cmdNew.push(`${label}=${JSON.stringify(s.response)}`);
    if (label.startsWith("route:") && s.status !== 404) routeNew.push(`${label}=${s.status} ${JSON.stringify(s.response)}`);
  }

  const report = {
    at: ts, url: URL, replacement: REPL_URL,
    changed: d.changed, added: d.added, removed: d.removed, diffs: d.diffs,
    cmdNew, routeNew, orig: origValid,
  };
  const file = path.join(OUT, `report-${ts.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 1));
  console.error(`[scan] reporte: ${file}`);
  console.log(JSON.stringify({
    n: list.length,
    valid: Object.keys(origValid).length,
    changed: d.changed.length,
    changedLabels: d.changed,
    added: d.added,
    diffs: d.diffs,
    cmdNew,
    routeNew,
  }, null, 1));
})().catch((e) => { console.error("[scan] ERR", e.stack || e); process.exit(1); });

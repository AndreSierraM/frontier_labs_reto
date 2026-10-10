#!/usr/bin/env node
/**
 * Recon ampliado: corre el mapeo (`monitor/probes.js`) contra el original y lo
 * envía a `/api/monitor/map`, que compara con el mapa anterior y avisa si hay
 * valores NUEVOS o CAMBIADOS. Escribe `changed=0|1` en `$GITHUB_OUTPUT`.
 */
import fs from "node:fs";
import probes from "../monitor/probes.js";
import battery from "../monitor/battery.js";

const { runProbes } = probes;
const { hasInfra } = battery;

const MONITOR_URL = (process.env.MONITOR_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, "");
const MONITOR_TOKEN = process.env.MONITOR_TOKEN || "";
const URL = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
const TOKEN = process.env.TOKEN_CAJA_NEGRA || "";

function out(k, v) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

(async () => {
  if (!URL || !TOKEN) {
    console.error("[recon] faltan URL_API_ENTRYPOINT / TOKEN_CAJA_NEGRA");
    process.exit(2);
  }
  const map = await runProbes(URL, TOKEN, { abortOnInfra: true, sleepMs: 40 });
  const n = Object.keys(map).length;
  console.log(`[recon] ${n} sondas ejecutadas`);

  if (hasInfra(map)) {
    console.log("[recon] sin baseline: el original está rate-limited (429/infra)");
    out("changed", "0");
    return;
  }

  const res = await fetch(MONITOR_URL + "/api/monitor/map", {
    method: "POST",
    headers: { Authorization: "Bearer " + MONITOR_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ map }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await res.json();
  console.log("[recon] " + JSON.stringify({
    ok: j.ok,
    baseline: j.baseline,
    changed: j.changed,
    added: j.added ? j.added.length : 0,
    changedLabels: j.changedLabels ? j.changedLabels.length : 0,
    total: j.total,
  }));
  if (j.added && j.added.length) console.log("[recon] NUEVOS: " + j.added.slice(0, 20).join(", "));
  if (j.changedLabels && j.changedLabels.length) console.log("[recon] CAMBIADOS: " + j.changedLabels.slice(0, 20).join(", "));
  out("changed", j.changed ? "1" : "0");
})().catch((e) => {
  console.error("[recon] error:", e.message);
  process.exit(1);
});
/**
 * Verificador determinista: arranca el reemplazo LOCAL y compara la batería y
 * el mapa ampliado contra la referencia del monitor (sin re-martillar el
 * original). No usa LLM.
 */
import { spawn } from "node:child_process";
import observe from "../../monitor/observe.js";
import { config } from "./config.mjs";

const { runBattery, runAll, diff, hasInfra } = observe;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function monitorGet(path) {
  if (!config.monitorToken) return null;
  try {
    const r = await fetch(config.monitorUrl + path, {
      headers: { Authorization: "Bearer " + config.monitorToken },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    return null;
  }
}

export async function verifyAgainstOriginal({ root, port = 3211 }) {
  const url = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
  const token = process.env.TOKEN_CAJA_NEGRA || "";
  const base = `http://127.0.0.1:${port}`;

  const child = spawn("node", ["reemplazo/src/server.js"], {
    cwd: root,
    env: { ...process.env, TOKEN_API_ENTRYPOINT: "local-swarm", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (d) => (logs += d));
  child.stderr.on("data", (d) => (logs += d));

  try {
    let up = false;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(base + "/health", {
          headers: { Authorization: "Bearer local-swarm" },
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) { up = true; break; }
      } catch (_) {}
      await sleep(250);
    }
    if (!up) return { ok: false, inconclusive: true, divergences: [], summary: "el reemplazo local no arrancó: " + logs.slice(0, 300) };

    // Referencia: snapshot + mapa del monitor (o se sondea el original).
    const status = await monitorGet("/api/monitor/status");
    const mapRes = await monitorGet("/api/monitor/map");
    let reference = status && status.lastSnapshot ? status.lastSnapshot.foto : null;
    if (!reference) {
      if (!url || !token) return { ok: false, inconclusive: true, divergences: [], summary: "sin snapshot del monitor ni credenciales del original" };
      reference = await runBattery(url, token, { sleepMs: 60 });
    }
    if (hasInfra(reference)) return { ok: false, inconclusive: true, divergences: [], summary: "la referencia del original está rate-limited (429/infra)" };

    const local = await runBattery(base, "local-swarm", { sleepMs: 20 });
    if (hasInfra(local)) return { ok: false, inconclusive: true, divergences: [], summary: "el reemplazo local devolvió 429 o es inaccesible" };

    const divergences = diff(reference, local).diffs;

    // Verificación ampliada contra el mapa (cubre comandos/rutas nuevos).
    let mapDivergences = [];
    const refMap = mapRes && mapRes.map ? mapRes.map.samples : null;
    if (refMap) {
      const localMap = await runAll(base, "local-swarm", { abortOnInfra: false, sleepMs: 10 });
      if (!hasInfra(localMap)) mapDivergences = diff(refMap, localMap).diffs;
    }

    const all = [...divergences, ...mapDivergences];
    return {
      ok: all.length === 0,
      divergences: all,
      summary: all.length
        ? `${all.length} divergencias (${divergences.length} batería, ${mapDivergences.length} mapa)`
        : "sin divergencias vs el original (batería + mapa)",
    };
  } finally {
    child.kill("SIGKILL");
  }
}
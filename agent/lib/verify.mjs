/**
 * Verificador determinista: arranca el reemplazo LOCAL y compara la batería
 * contra una referencia del original. La referencia es el último snapshot del
 * monitor (evita re-martillar el original y chocar con 429). No usa LLM.
 */
import { spawn } from "node:child_process";
import battery from "../../monitor/battery.js";
import probes from "../../monitor/probes.js";

const { runBattery, diffLabels, hasInfra } = battery;
const { runProbes, diffMap } = probes;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function referenceFromMonitor() {
  const base = (process.env.MONITOR_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, "");
  const token = process.env.MONITOR_TOKEN || "";
  if (!token) return null;
  try {
    const r = await fetch(base + "/api/monitor/status", {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.lastSnapshot && j.lastSnapshot.foto ? j.lastSnapshot.foto : null;
  } catch (_) {
    return null;
  }
}

async function referenceMapFromMonitor() {
  const base = (process.env.MONITOR_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, "");
  const token = process.env.MONITOR_TOKEN || "";
  if (!token) return null;
  try {
    const r = await fetch(base + "/api/monitor/map", {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.map && j.map.samples ? j.map.samples : null;
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
        if (r.ok) {
          up = true;
          break;
        }
      } catch (_) {}
      await sleep(250);
    }
    if (!up) return { ok: false, inconclusive: true, divergences: [], summary: "el reemplazo local no arrancó: " + logs.slice(0, 300) };

    let reference = await referenceFromMonitor();
    if (!reference) {
      if (!url || !token) return { ok: false, inconclusive: true, divergences: [], summary: "sin snapshot del monitor ni credenciales del original" };
      reference = await runBattery(url, token, { sleepMs: 60 });
    }
    if (hasInfra(reference)) {
      return { ok: false, inconclusive: true, divergences: [], summary: "la referencia del original está rate-limited (429/infra)" };
    }

    const local = await runBattery(base, "local-swarm", { sleepMs: 20 });
    if (hasInfra(local)) {
      return { ok: false, inconclusive: true, divergences: [], summary: "el reemplazo local devolvió 429 o es inaccesible" };
    }

    const divergences = diffLabels(reference, local);

    // Verificación ampliada contra el mapa (cubre comandos/rutas nuevos).
    let mapDivergences = [];
    const refMap = await referenceMapFromMonitor();
    if (refMap) {
      const localMap = await runProbes(base, "local-swarm", { abortOnInfra: false, sleepMs: 10 });
      if (!hasInfra(localMap)) {
        const md = diffMap(refMap, localMap);
        mapDivergences = [...md.changed, ...md.added].map((label) => ({ label }));
      }
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
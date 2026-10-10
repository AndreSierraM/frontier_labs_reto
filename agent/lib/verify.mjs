/**
 * Verificador determinista: arranca el reemplazo LOCAL y compara la batería y
 * el mapa ampliado contra la referencia del monitor (sin re-martillar el
 * original). No usa LLM.
 *
 * El veredicto se calcula en `gate()` (puro, testeable); el arranque del
 * reemplazo y la lectura del monitor quedan en adaptadores.
 */
import { spawn } from "node:child_process";
import observe from "../../monitor/observe.js";
import compare from "../../monitor/compare.js";
import { config } from "./config.mjs";

const { runBattery, runAll } = observe;
const { diff, hasInfra } = compare;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REFERENCE_RATE_LIMITED = "la referencia del original está rate-limited (429/infra)";
const inconclusive = (summary) => ({
  ok: false,
  inconclusive: true,
  divergences: [],
  mapDivergences: [],
  summary,
});

/**
 * Veredicto puro: compara la batería y el mapa de referencia contra el
 * candidato local. No hace I/O.
 */
export function gate({ reference = {}, candidate = {}, referenceMap = null, candidateMap = null }) {
  if (hasInfra(reference)) return inconclusive(REFERENCE_RATE_LIMITED);
  if (hasInfra(candidate)) return inconclusive("el reemplazo local devolvió 429 o es inaccesible");

  const divergences = diff(reference, candidate).diffs;
  const mapDivergences = referenceMap && candidateMap ? diff(referenceMap, candidateMap).diffs : [];
  const all = [...divergences, ...mapDivergences];
  return {
    ok: all.length === 0,
    inconclusive: false,
    divergences,
    mapDivergences,
    summary: all.length
      ? `${all.length} divergencias (${divergences.length} batería, ${mapDivergences.length} mapa)`
      : "sin divergencias vs el original (batería + mapa)",
  };
}

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

/** Arranca el reemplazo local y espera a que `/health` responda. */
async function startCandidate(root, port) {
  const base = `http://127.0.0.1:${port}`;
  const child = spawn("node", ["reemplazo/src/server.js"], {
    cwd: root,
    env: { ...process.env, TOKEN_API_ENTRYPOINT: "local-swarm", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (d) => (logs += d));
  child.stderr.on("data", (d) => (logs += d));
  const stop = () => child.kill("SIGKILL");

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
  if (!up) {
    stop();
    return { error: "el reemplazo local no arrancó: " + logs.slice(0, 300) };
  }
  return { base, logs, stop };
}

/** Referencia del original: snapshot + mapa del monitor (o sonda en vivo). */
async function monitorReference() {
  const url = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
  const token = process.env.TOKEN_CAJA_NEGRA || "";

  const status = await monitorGet("/api/monitor/status");
  const mapRes = await monitorGet("/api/monitor/map");
  let reference = status && status.lastSnapshot ? status.lastSnapshot.foto : null;
  if (!reference) {
    if (!url || !token) return { error: "sin snapshot del monitor ni credenciales del original" };
    reference = await runBattery(url, token, { sleepMs: 60 });
  }
  const referenceMap = mapRes && mapRes.map ? mapRes.map.samples : null;
  return { reference, referenceMap };
}

export async function verifyAgainstOriginal({ root, port = 3211 }) {
  const started = await startCandidate(root, port);
  if (started.error) return inconclusive(started.error);

  try {
    const ref = await monitorReference();
    if (ref.error) return inconclusive(ref.error);

    // La referencia manda: si el original está rate-limited, no se sondea el
    // candidato (mismo orden que antes de extraer la puerta).
    if (hasInfra(ref.reference)) return inconclusive(REFERENCE_RATE_LIMITED);

    const candidate = await runBattery(started.base, "local-swarm", { sleepMs: 20, throttle: false });
    if (hasInfra(candidate)) return gate({ reference: ref.reference, candidate });

    let candidateMap = null;
    if (ref.referenceMap) {
      const localMap = await runAll(started.base, "local-swarm", { abortOnInfra: false, sleepMs: 10, throttle: false });
      if (!hasInfra(localMap)) candidateMap = localMap;
    }

    return gate({ reference: ref.reference, candidate, referenceMap: ref.referenceMap, candidateMap });
  } finally {
    started.stop();
  }
}

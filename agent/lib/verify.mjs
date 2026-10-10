/**
 * Verificador determinista: arranca el reemplazo LOCAL, corre la batería contra
 * el original y contra el local, y compara. No usa LLM.
 */
import { spawn } from "node:child_process";
import battery from "../../monitor/battery.js";

const { runBattery, diffLabels } = battery;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function verifyAgainstOriginal({ root, port = 3211 }) {
  const url = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
  const token = process.env.TOKEN_CAJA_NEGRA || "";
  if (!url || !token) return { ok: false, divergences: [], summary: "faltan URL_API_ENTRYPOINT o TOKEN_CAJA_NEGRA" };

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
    if (!up) return { ok: false, divergences: [], summary: "el reemplazo local no arrancó: " + logs.slice(0, 300) };

    const original = await runBattery(url, token, { sleepMs: 40 });
    const local = await runBattery(base, "local-swarm", { sleepMs: 20 });
    const divergences = diffLabels(original, local);
    return {
      ok: divergences.length === 0,
      divergences,
      summary: divergences.length ? `${divergences.length} divergencias vs el original` : "sin divergencias vs el original",
    };
  } finally {
    child.kill("SIGKILL");
  }
}
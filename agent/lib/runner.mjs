/**
 * Adaptador de proceso: arranca el reemplazo local y espera a que `/health`
 * responda. Puro I/O; la lógica de verificación vive en `verify.mjs`.
 */
import { spawn } from "node:child_process";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Arranca `node reemplazo/src/server.js` en el puerto dado y espera health.
 * @returns {{base:string, logs:string, stop:Function} | {error:string}}
 */
export async function startCandidate(root, port) {
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

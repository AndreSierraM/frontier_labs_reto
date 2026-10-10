/**
 * Ejecuta `pi` en modo headless con un rol y una tarea.
 * Devuelve { code, out, err }; `out` es el informe del agente.
 * Aplica un timeout duro: un agente no puede colgar el job entero.
 */
import { spawn } from "node:child_process";

// Modelo fijo y explícito (no depende de la config local).
const PROVIDER = process.env.SWARM_PROVIDER || "openrouter";
const MODEL = process.env.SWARM_MODEL || "deepseek/deepseek-v4.1-flash";
const TIMEOUT_MS = Number(process.env.SWARM_AGENT_TIMEOUT_MS || 420000); // 7 min

export function runPi({ system, task, cwd, label = "pi", env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn(
      "pi",
      ["--print", "--provider", PROVIDER, "--model", MODEL, "--append-system-prompt", system, task],
      { cwd, env, stdio: ["ignore", "pipe", "pipe"] }
    );

    const captured = { out: "", err: "" };
    let timedOut = false;

    const attach = (stream, key) => {
      let buf = "";
      const emit = (line) => {
        captured[key] += line + "\n";
        (key === "err" ? process.stderr : process.stdout).write(`[${label}] ${line}\n`);
      };
      stream.on("data", (chunk) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const l of lines) emit(l);
      });
      stream.on("end", () => {
        if (buf) emit(buf);
      });
    };

    attach(child.stdout, "out");
    attach(child.stderr, "err");

    const timer = setTimeout(() => {
      timedOut = true;
      captured.err += `\n[timeout] agente ${label} superó ${TIMEOUT_MS} ms\n`;
      process.stderr.write(`[${label}] timeout (${TIMEOUT_MS} ms), matando\n`);
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: timedOut ? 124 : code ?? 1, out: captured.out, err: captured.err, timedOut });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: 1, out: captured.out, err: String(e.message), timedOut });
    });
  });
}
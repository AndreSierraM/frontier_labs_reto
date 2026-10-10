/**
 * Ejecuta `pi` en modo headless con un rol y una tarea.
 * Devuelve { code, out, err }; `out` es el informe del agente.
 */
import { spawn } from "node:child_process";

export function runPi({ system, task, cwd, label = "pi", env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn("pi", ["--print", "--append-system-prompt", system, task], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const captured = { out: "", err: "" };

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

    child.on("close", (code) => resolve({ code: code ?? 1, out: captured.out, err: captured.err }));
    child.on("error", (e) => resolve({ code: 1, out: captured.out, err: String(e.message) }));
  });
}
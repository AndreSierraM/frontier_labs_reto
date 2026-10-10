/**
 * Ejecuta la suite del reemplazo (dominio + HTTP).
 */
import { spawnSync } from "node:child_process";
import { config } from "./config.mjs";

export function runTests() {
  const res = spawnSync("npm", ["--prefix", "reemplazo", "test"], { cwd: config.root, encoding: "utf8" });
  return { code: res.status ?? 1, out: (res.stdout || "") + (res.stderr || "") };
}
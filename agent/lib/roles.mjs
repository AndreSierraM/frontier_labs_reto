/**
 * Carga los prompts de rol (`agent/roles/<nombre>.md`).
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

export function readRole(name) {
  return fs.readFileSync(path.join(config.root, "agent", "roles", `${name}.md`), "utf8");
}
/**
 * Directorio de artefactos por corrida del enjambre:
 *   agent/state/<UTC>/scout-*.md, diagnosis.md, fixer-*.md, verification.json, pr-body.md
 */
import fs from "node:fs";
import path from "node:path";

export function makeRunDir(root) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(root, "agent", "state", stamp);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function save(dir, name, content) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  return file;
}
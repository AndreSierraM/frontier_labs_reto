/**
 * Configuración del enjambre, resuelta una sola vez desde el entorno.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const config = {
  root: ROOT,
  monitorUrl: (process.env.MONITOR_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, ""),
  monitorToken: process.env.MONITOR_TOKEN || "",
  changesFile: process.env.SWARM_CHANGES_FILE || "",
  dryRun: process.argv.includes("--dry-run"),
  maxScouts: Number(process.env.MAX_SCOUTS || 2),
  maxFixRounds: Number(process.env.MAX_FIX_ROUNDS || 2),
};
/**
 * Utilidades de git para el pipeline (diff sin commitear).
 */
import { spawnSync } from "node:child_process";
import { config } from "./config.mjs";

export function gitDiff() {
  const res = spawnSync("git", ["diff"], { cwd: config.root, encoding: "utf8" });
  return res.stdout || "";
}

export function gitStatusShort() {
  const res = spawnSync("git", ["status", "--short"], { cwd: config.root, encoding: "utf8" });
  return res.stdout || "";
}
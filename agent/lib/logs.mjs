/**
 * Logs de runtime de Vercel (nuestra API desplegada) para que el enjambre
 * pueda diagnosticar errores reales, no solo divergencias de comportamiento.
 *
 * Usa el CLI de Vercel ya instalado en el runner:
 *   vercel logs --project <p> --environment production --level error --json
 */
import { spawnSync } from "node:child_process";

export function fetchVercelLogs({ root, since = "2h", limit = 50 } = {}) {
  const token = process.env.VERCEL_TOKEN || "";
  const project = process.env.VERCEL_PROJECT || "frontier-labs-reto";
  const scope = process.env.VERCEL_SCOPE || "cabalastechhub";
  if (!token) {
    return { ok: false, text: "(sin VERCEL_TOKEN: no se consultan logs de Vercel)" };
  }

  const args = [
    "logs",
    "--project", project,
    "--environment", "production",
    "--level", "error",
    "--since", since,
    "--limit", String(limit),
    "--json",
    "--token", token,
    "--scope", scope,
  ];

  const res = spawnSync("vercel", args, { cwd: root, encoding: "utf8", timeout: 60000 });
  const out = (res.stdout || "").trim();
  const err = (res.stderr || "").trim();
  if (res.error) return { ok: false, text: `(error al ejecutar vercel: ${res.error.message})` };
  return {
    ok: res.status === 0,
    code: res.status,
    text: out || err || "(sin errores recientes en los logs de Vercel)",
  };
}
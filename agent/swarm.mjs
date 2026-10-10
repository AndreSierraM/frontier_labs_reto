#!/usr/bin/env node
/**
 * Enjambre de adaptación.
 *
 *   watcher (cron) → cambios pendientes
 *     → scouts en paralelo  (investigan cada etiqueta contra el original)
 *     → analista            (diagnóstico accionable)
 *     → fixer               (parche + tests)
 *     → verificador         (determinista: local vs original)
 *     → reporter            (cuerpo del PR)
 *
 * Uso:
 *   node agent/swarm.mjs             # corre el enjambre
 *   node agent/swarm.mjs --dry-run   # solo muestra el plan
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runPi } from "./lib/pi.mjs";
import { makeRunDir, save } from "./lib/runstate.mjs";
import { verifyAgainstOriginal } from "./lib/verify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MONITOR_URL = (process.env.MONITOR_URL || "https://frontier-labs-reto.vercel.app").replace(/\/$/, "");
const MONITOR_TOKEN = process.env.MONITOR_TOKEN || "";
const CHANGES_FILE = process.env.SWARM_CHANGES_FILE || "";
const DRY = process.argv.includes("--dry-run");
const MAX_SCOUTS = Number(process.env.MAX_SCOUTS || 4);
const MAX_FIX_ROUNDS = Number(process.env.MAX_FIX_ROUNDS || 2);

const log = (...a) => console.log("[swarm]", ...a);

function role(name) {
  return fs.readFileSync(path.join(ROOT, "agent", "roles", `${name}.md`), "utf8");
}

async function monitorFetch(pathname, options = {}) {
  const res = await fetch(MONITOR_URL + pathname, {
    ...options,
    headers: { Authorization: "Bearer " + MONITOR_TOKEN, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

function pendingChanges(events) {
  const acks = (events || []).filter((e) => e.kind === "adaptation_applied").map((e) => e.id);
  const lastAck = acks.length ? Math.max(...acks) : 0;
  return (events || []).filter((e) => e.kind === "original_changed" && e.id > lastAck);
}

function runTests() {
  const res = spawnSync("npm", ["--prefix", "reemplazo", "test"], { cwd: ROOT, encoding: "utf8" });
  return { code: res.status ?? 1, out: (res.stdout || "") + (res.stderr || "") };
}

function changeText(ch) {
  return `## ${ch.label}\n- antes: ${JSON.stringify(ch.before)}\n- ahora: ${JSON.stringify(ch.after)}\n- detectado: ${ch.detected_at}`;
}

async function ack(labels) {
  if (CHANGES_FILE) {
    log("modo local (SWARM_CHANGES_FILE): no se marca el evento en el monitor");
    return;
  }
  try {
    await monitorFetch("/api/monitor/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: labels.join(",") }),
    });
    log("cambios marcados como atendidos");
  } catch (e) {
    log("aviso: no se pudo marcar:", e.message);
  }
}

async function main() {
  let changes;
  if (CHANGES_FILE) {
    const raw = JSON.parse(fs.readFileSync(CHANGES_FILE, "utf8"));
    changes = Array.isArray(raw) ? raw : [raw];
  } else {
    if (!MONITOR_TOKEN) {
      console.error("[swarm] falta MONITOR_TOKEN (o usa SWARM_CHANGES_FILE)");
      process.exit(2);
    }
    const st = await monitorFetch("/api/monitor/status");
    changes = pendingChanges(st.events);
  }
  if (!changes.length) {
    log("sin cambios pendientes");
    return;
  }

  const runDir = makeRunDir(ROOT);
  save(runDir, "changes.json", changes);
  log(`${changes.length} cambios pendientes`, changes.map((c) => c.label).join(", "));

  if (DRY) {
    log("dry-run: se planificaría", changes.length, "scouts + analista + fixer + verificación + reporter");
    save(runDir, "plan.md", changes.map(changeText).join("\n\n"));
    return;
  }

  // ---- Fase 1: scouts en paralelo ---------------------------------------
  const scouts = await Promise.all(
    changes.slice(0, MAX_SCOUTS).map(async (ch) => {
      const task = `Investiga la etiqueta "${ch.label}" del servicio original.\n\n${changeText(ch)}\n\nReproduce, aísla la regla y entrega el informe.`;
      const r = await runPi({ system: role("scout"), task, cwd: ROOT, label: `scout:${ch.label}` });
      if (r.timedOut) log(`aviso: scout ${ch.label} agotó el tiempo`);
      save(runDir, `scout-${ch.label}.md`, r.out || "(sin salida)");
      return `### Informe scout · ${ch.label}${r.timedOut ? " (TIMEOUT)" : ""}\n\n${r.out || "(sin salida)"}`;
    })
  );

  // ---- Fase 2: analista --------------------------------------------------
  const analystTask = [
    "Diagnóstico para adaptar el reemplazo.",
    "",
    "## Cambios detectados por el monitor",
    changes.map(changeText).join("\n\n"),
    "",
    "## Informes de los exploradores",
    scouts.join("\n\n"),
    "",
    "Spec vigente: `reto2-investigacion/SPEC.md`. Dominio: `reemplazo/src/domain.js`.",
  ].join("\n");
  const analyst = await runPi({ system: role("analyst"), task: analystTask, cwd: ROOT, label: "analyst" });
  save(runDir, "diagnosis.md", analyst.out);
  log("diagnóstico listo");

  // El analista decide con una línea `PATCH: yes|no`. Sin cambio real no se
  // invoca al fixer ni se abre PR (evita parches por falsos positivos).
  if (/^PATCH:\s*no\b/im.test(analyst.out)) {
    log("el analista concluyó PATCH: no (sin cambio real que adaptar)");
    save(runDir, "pr-body.md", "No se requiere adaptación.\n\n" + analyst.out);
    await ack(changes.map((c) => c.label));
    return;
  }

  // ---- Fase 3: fixer + verificación -------------------------------------
  let verification = null;
  let fixerOut = "";
  for (let round = 1; round <= MAX_FIX_ROUNDS; round++) {
    const fixerTask = [
      "Diagnóstico:",
      analyst.out,
      verification ? `\nLa verificación anterior falló:\n${verification.summary}\nCorrige el parche.` : "",
    ].join("\n");
    const fixer = await runPi({ system: role("fixer"), task: fixerTask, cwd: ROOT, label: `fixer#${round}` });
    fixerOut = fixer.out;
    save(runDir, `fixer-${round}.md`, fixer.out);

    const tests = runTests();
    save(runDir, `tests-${round}.txt`, tests.out);
    if (tests.code !== 0) {
      verification = { ok: false, divergences: [], summary: "`npm test` falló:\n" + tests.out.slice(-2000) };
      log(`ronda ${round}: tests rojos, reintentando`);
      continue;
    }

    verification = await verifyAgainstOriginal({ root: ROOT });
    save(runDir, `verification-${round}.json`, verification);
    log(`ronda ${round}: ${verification.summary}`);
    if (verification.inconclusive) {
      console.error("[swarm] verificación no concluyente (infra/rate-limit); evento queda pendiente, sin PR");
      process.exit(0);
    }
    if (verification.ok) break;
  }

  if (!verification || !verification.ok) {
    console.error("[swarm] no se logró adaptar con verificación verde; no se marca el evento");
    process.exit(1);
  }

  // ---- Fase 4: reporter --------------------------------------------------
  const reporterTask = [
    "Redacta el cuerpo del PR.",
    "",
    "## Cambios",
    changes.map(changeText).join("\n\n"),
    "",
    "## Diagnóstico",
    analyst.out,
    "",
    "## Resumen del fixer",
    fixerOut,
    "",
    "## Verificación",
    JSON.stringify(verification, null, 2),
  ].join("\n");
  const reporter = await runPi({ system: role("reporter"), task: reporterTask, cwd: ROOT, label: "reporter" });
  save(runDir, "pr-body.md", reporter.out);

  await ack(changes.map((c) => c.label));
  log("enjambre completo: parche aplicado, tests verdes y sin divergencias");
  log("artefactos en", path.relative(ROOT, runDir));
}

main().catch((e) => {
  console.error("[swarm] error:", e.message);
  process.exit(1);
});
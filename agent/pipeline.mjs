/**
 * Pipeline del enjambre: scouts → analista → fixer → verificación → reporter.
 *
 * Cada fase es una función independiente; `runSwarm` las orquesta y devuelve un
 * estado (`done`, `no-change`, `dry-run`, `no-patch`, `inconclusive`, `failed`).
 */
import { config } from "./lib/config.mjs";
import { fetchChanges, ack } from "./lib/monitorClient.mjs";
import { makeRunDir, save } from "./lib/runstate.mjs";
import { runPhase } from "./lib/phase.mjs";
import { runTests } from "./lib/tests.mjs";
import { verifyAgainstOriginal } from "./lib/verify.mjs";
import { fetchVercelLogs } from "./lib/logs.mjs";

const log = (...a) => console.log("[swarm]", ...a);

const changeText = (ch) =>
  `## ${ch.label}\n- antes: ${JSON.stringify(ch.before)}\n- ahora: ${JSON.stringify(ch.after)}\n- detectado: ${ch.detected_at}`;

// ---- Fase 1: scouts en paralelo -----------------------------------------
async function scoutsPhase(changes, runDir) {
  const reports = await Promise.all(
    changes.slice(0, config.maxScouts).map(async (ch) => {
      const task = `Investiga la etiqueta "${ch.label}" del servicio original.\n\n${changeText(ch)}\n\nReproduce, aísla la regla y entrega el informe.`;
      const r = await runPhase({ role: "scout", task, label: `scout:${ch.label}`, runDir, file: `scout-${ch.label}.md` });
      if (r.timedOut) log(`aviso: scout ${ch.label} agotó el tiempo`);
      return `### Informe scout · ${ch.label}${r.timedOut ? " (TIMEOUT)" : ""}\n\n${r.out || "(sin salida)"}`;
    })
  );
  return reports.join("\n\n");
}

// ---- Fase 2: analista ----------------------------------------------------
function analystTask(changes, scoutReports, vercelLogs) {
  return [
    "Diagnóstico para adaptar el reemplazo.",
    "",
    "## Cambios detectados por el monitor",
    changes.map(changeText).join("\n\n"),
    "",
    "## Informes de los exploradores",
    scoutReports,
    "",
    "## Errores recientes de nuestra API desplegada (logs de Vercel)",
    "```",
    vercelLogs.slice(0, 8000),
    "```",
    "",
    "Spec vigente: `reto2-investigacion/SPEC.md`. Dominio: `reemplazo/src/domain.js`.",
  ].join("\n");
}

const saysNoPatch = (diagnosis) => /^PATCH:\s*no\b/im.test(diagnosis);

// ---- Fase 3: fixer + verificación (con reintentos) -----------------------
async function fixAndVerify(diagnosis, runDir) {
  let verification = null;
  let fixerOut = "";
  for (let round = 1; round <= config.maxFixRounds; round++) {
    const task = [
      "Diagnóstico:",
      diagnosis,
      verification ? `\nLa verificación anterior falló:\n${verification.summary}\nCorrige el parche.` : "",
    ].join("\n");
    const fixer = await runPhase({ role: "fixer", task, label: `fixer#${round}`, runDir, file: `fixer-${round}.md` });
    fixerOut = fixer.out;

    const tests = runTests();
    save(runDir, `tests-${round}.txt`, tests.out);
    if (tests.code !== 0) {
      verification = { ok: false, divergences: [], summary: "`npm test` falló:\n" + tests.out.slice(-2000) };
      log(`ronda ${round}: tests rojos, reintentando`);
      continue;
    }

    verification = await verifyAgainstOriginal({ root: config.root });
    save(runDir, `verification-${round}.json`, verification);
    log(`ronda ${round}: ${verification.summary}`);
    if (verification.inconclusive) return { verification, fixerOut, inconclusive: true };
    if (verification.ok) break;
  }
  return { verification, fixerOut, inconclusive: false };
}

// ---- Fase 4: reporter ----------------------------------------------------
function reporterTask(changes, diagnosis, fixerOut, verification) {
  return [
    "Redacta el cuerpo del PR.",
    "",
    "## Cambios",
    changes.map(changeText).join("\n\n"),
    "",
    "## Diagnóstico",
    diagnosis,
    "",
    "## Resumen del fixer",
    fixerOut,
    "",
    "## Verificación",
    JSON.stringify(verification, null, 2),
  ].join("\n");
}

// ---- Orquestador ---------------------------------------------------------
export async function runSwarm() {
  const changes = await fetchChanges();
  if (!changes.length) {
    log("sin cambios pendientes");
    return { status: "no-change" };
  }

  const runDir = makeRunDir(config.root);
  save(runDir, "changes.json", changes);
  log(`${changes.length} cambios pendientes`, changes.map((c) => c.label).join(", "));

  if (config.dryRun) {
    log("dry-run: no se invoca ningún agente");
    save(runDir, "plan.md", changes.map(changeText).join("\n\n"));
    return { status: "dry-run" };
  }

  const vercelLogs = fetchVercelLogs({ root: config.root });
  save(runDir, "vercel-errors.jsonl", vercelLogs.text);
  log(`logs de Vercel: ${vercelLogs.ok ? "consultados" : "no disponibles"}`);

  const scoutReports = await scoutsPhase(changes, runDir);
  const analyst = await runPhase({
    role: "analyst",
    task: analystTask(changes, scoutReports, vercelLogs.text),
    label: "analyst",
    runDir,
    file: "diagnosis.md",
  });
  log("diagnóstico listo");

  if (saysNoPatch(analyst.out)) {
    log("el analista concluyó PATCH: no (sin cambio real que adaptar)");
    save(runDir, "pr-body.md", "No se requiere adaptación.\n\n" + analyst.out);
    await ack(changes.map((c) => c.label));
    return { status: "no-patch" };
  }

  const { verification, fixerOut, inconclusive } = await fixAndVerify(analyst.out, runDir);
  if (inconclusive) {
    log("verificación no concluyente (infra/rate-limit); evento queda pendiente, sin PR");
    return { status: "inconclusive" };
  }
  if (!verification || !verification.ok) {
    log("no se logró adaptar con verificación verde; no se marca el evento");
    return { status: "failed", verification };
  }

  await runPhase({
    role: "reporter",
    task: reporterTask(changes, analyst.out, fixerOut, verification),
    label: "reporter",
    runDir,
    file: "pr-body.md",
  });

  await ack(changes.map((c) => c.label));
  log("enjambre completo: parche aplicado, tests verdes y sin divergencias");
  log("artefactos en", runDir.slice(config.root.length + 1));
  return { status: "done" };
}
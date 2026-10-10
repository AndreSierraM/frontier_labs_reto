/**
 * Pipeline del enjambre: scouts → analista → (fixer → verificación → revisor)*
 * → reporter. Devuelve un estado y reporta la corrida al monitor.
 */
import { config } from "./lib/config.mjs";
import { fetchChanges, ack } from "./lib/monitorClient.mjs";
import { makeRunDir, save } from "./lib/runstate.mjs";
import { runPhase } from "./lib/phase.mjs";
import { runTests } from "./lib/tests.mjs";
import { verifyAgainstOriginal } from "./lib/verify.mjs";
import { fetchVercelLogs } from "./lib/logs.mjs";
import { gitDiff } from "./lib/git.mjs";

const log = (...a) => console.log("[swarm]", ...a);

const changeText = (ch) =>
  `## ${ch.label}\n- antes: ${JSON.stringify(ch.before)}\n- ahora: ${JSON.stringify(ch.after)}\n- detectado: ${ch.detected_at}`;

const needsChanges = (review) => /^REVIEW:\s*cambios/im.test(review || "");
const saysNoPatch = (diagnosis) => /^PATCH:\s*no\b/im.test(diagnosis || "");

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
const analystTask = (changes, scoutReports, vercelLogs) =>
  [
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

// ---- Fase 3: adaptación con gate de verificación + revisión --------------
async function reviewPhase(diagnosis, fixerOut, verification, runDir) {
  const diff = gitDiff();
  save(runDir, "fixer.patch", diff);
  const task = [
    "Revisa el parche antes de proponerlo.",
    "",
    "## Diagnóstico",
    diagnosis,
    "",
    "## Resumen del fixer",
    fixerOut,
    "",
    "## Verificación",
    JSON.stringify(verification, null, 2),
    "",
    "## Diff (git diff)",
    "```diff",
    diff.slice(0, 12000),
    "```",
  ].join("\n");
  return (await runPhase({ role: "reviewer", task, label: "reviewer", runDir, file: "review.md" })).out;
}

async function adaptPhase(diagnosis, runDir) {
  let verification = null;
  let fixerOut = "";
  let review = "";

  for (let round = 1; round <= config.maxFixRounds; round++) {
    const task = [
      "Diagnóstico:",
      diagnosis,
      verification && !verification.ok ? `\nLa verificación anterior falló:\n${verification.summary}\nCorrige el parche.` : "",
      needsChanges(review) ? `\nLa revisión pidió cambios:\n${review}\nAplica las correcciones.` : "",
    ]
      .filter(Boolean)
      .join("\n");

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
    if (verification.inconclusive) return { status: "inconclusive", verification, fixerOut, review };
    if (!verification.ok) continue;

    review = await reviewPhase(diagnosis, fixerOut, verification, runDir);
    log(`ronda ${round}: revisión ${needsChanges(review) ? "pide cambios" : "aprobada"}`);
    if (!needsChanges(review)) return { status: "ok", verification, fixerOut, review };
  }

  return { status: needsChanges(review) ? "needs-review" : "failed", verification, fixerOut, review };
}

// ---- Fase 4: reporter ----------------------------------------------------
const reporterTask = (changes, diagnosis, fixerOut, verification, review) =>
  [
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
    "",
    "## Revisión",
    review,
  ].join("\n");

// ---- Orquestador ---------------------------------------------------------
// El reporte al monitor lo hace el workflow (tiene run-id y PR-url del CI).
function finish(status, labels, runDir, extra = {}) {
  const summary = { status, labels, ...extra, at: new Date().toISOString() };
  if (runDir) save(runDir, "summary.json", summary);
  return { status, ...extra };
}

export async function runSwarm() {
  const changes = await fetchChanges();
  if (!changes.length) {
    log("sin cambios pendientes");
    return finish("no-change", []);
  }
  const labels = changes.map((c) => c.label);

  const runDir = makeRunDir(config.root);
  save(runDir, "changes.json", changes);
  log(`${changes.length} cambios pendientes`, labels.join(", "));

  if (config.dryRun) {
    log("dry-run: no se invoca ningún agente");
    save(runDir, "plan.md", changes.map(changeText).join("\n\n"));
    return finish("dry-run", labels, runDir);
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
    await ack(labels);
    return finish("no-patch", labels, runDir);
  }

  const adapt = await adaptPhase(analyst.out, runDir);
  if (adapt.status === "inconclusive") {
    log("verificación no concluyente (infra/rate-limit); evento queda pendiente, sin PR");
    return finish("inconclusive", labels, runDir, { review: adapt.review });
  }
  if (adapt.status !== "ok") {
    log("sin parche aprobado (verificación + revisión); no se abre PR");
    return finish(adapt.status, labels, runDir, { review: adapt.review });
  }

  await runPhase({
    role: "reporter",
    task: reporterTask(changes, analyst.out, adapt.fixerOut, adapt.verification, adapt.review),
    label: "reporter",
    runDir,
    file: "pr-body.md",
  });

  await ack(labels);
  log("enjambre completo: parche aplicado, tests verdes, revisión y sin divergencias");
  log("artefactos en", runDir.slice(config.root.length + 1));
  return finish("done", labels, runDir, { review: adapt.review });
}
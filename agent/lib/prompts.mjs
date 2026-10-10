/**
 * Generadores de tareas/prompts para cada fase del pipeline del enjambre.
 *
 * Esta capa es pura (sin I/O ni estado): toma datos planos y devuelve strings.
 * Separa "qué le decimos al agente" de "cuándo lo invocamos".
 */

export const changeText = (ch) =>
  `## ${ch.label}\n- antes: ${JSON.stringify(ch.before)}\n- ahora: ${JSON.stringify(ch.after)}\n- detectado: ${ch.detected_at}`;

export function analystTask(changes, scoutReports, vercelLogs) {
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

export function adaptTask(diagnosis, verification, review) {
  const lines = [
    "Diagnóstico:",
    diagnosis,
  ];
  if (verification && !verification.ok) {
    lines.push(`\nLa verificación anterior falló:\n${verification.summary}\nCorrige el parche.`);
  }
  if (needsChanges(review)) {
    lines.push(`\nLa revisión pidió cambios:\n${review}\nAplica las correcciones.`);
  }
  return lines.filter(Boolean).join("\n");
}

export function reviewTask(diagnosis, fixerOut, verification, diff) {
  return [
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
}

export function reporterTask(changes, diagnosis, fixerOut, verification, review) {
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
    "",
    "## Revisión",
    review,
  ].join("\n");
}

// ---- helpers de decisión (puros) ----
export const needsChanges = (review) => /^REVIEW:\s*cambios/im.test(review || "");
export const saysNoPatch = (diagnosis) => /^PATCH:\s*no\b/im.test(diagnosis || "");

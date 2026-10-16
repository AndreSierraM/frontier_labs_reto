/**
 * Guarda de coherencia de una corrida de sondas.
 *
 * El monitor histórico fusionaba el resultado de cada corrida con el baseline
 * (`merged = { ...baseline, ...valid }`). Si una corrida parcial (429) perdía
 * el `__reset` o alguna sonda de estado, las muestras restantes se fundían
 * sobre un estado viejo y la foto quedaba internamente incoherente
 * (p. ej. `falta3` exitoso y `E510` = `E507` en la misma foto). Esa foto, usada
 * como referencia de verificación, producía divergencias falsas contra un
 * reemplazo limpio.
 *
 * Aquí se decide, con datos puros, si una corrida es de fiar antes de guardarla
 * como referencia: debe estar completa (todas las sondas respondieron) y sus
 * anclas de estado deben cuadrar (`__reset` efectivo, `ALTA` = AC-0001, ...).
 */
"use strict";

/** ¿Respondieron todas las sondas esperadas? */
function isComplete(samples, expected) {
  return Object.keys(samples || {}).length >= expected;
}

const cuentaId = (samples, label) => {
  const s = samples && samples[label];
  return s && s.response ? s.response.cuentaId : undefined;
};

/**
 * ¿Las anclas de estado de la corrida son coherentes? Una corrida con
 * `__reset` fallido o con los contadores de cuentas desplazados no sirve como
 * referencia (las sondas siguientes corrieron sobre un estado arrastrado).
 */
function anchorsOk(samples) {
  const s = samples || {};
  const resetOk = ["reset", "reset2"]
    .filter((l) => l in s)
    .every((l) => s[l] && s[l].status === 200 && s[l].response === "reset");
  const altaOk = !("ALTA" in s) || cuentaId(s, "ALTA") === "AC-0001";
  const alta2Ok = !("ALTA2" in s) || cuentaId(s, "ALTA2") === "AC-0002";
  const bloqueoOk =
    !("bloqueo-1" in s) ||
    (cuentaId(s, "bloqueo-1") === "AC-0001" && cuentaId(s, "bloqueo-2") === "AC-0002");
  const limOk =
    !("lim-A" in s) || (cuentaId(s, "lim-A") === "AC-0001" && cuentaId(s, "lim-B") === "AC-0002");
  return resetOk && altaOk && alta2Ok && bloqueoOk && limOk;
}

/** Una corrida es utilizable como referencia si está completa y es coherente. */
function cleanRun(samples, expected) {
  return isComplete(samples, expected) && anchorsOk(samples);
}

module.exports = { isComplete, anchorsOk, cleanRun };

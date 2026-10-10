/**
 * Núcleo puro de comparación: canonicalización, hashing y diff de mapas.
 *
 * Sin I/O ni sondas: solo transforma datos. Lo consumen tanto el transporte
 * (`observe.js`) como la puerta de verificación (`agent/lib/verify.mjs`).
 */
"use strict";

const crypto = require("crypto");

// Postgres jsonb no preserva el orden de claves: comparar/hashear exige una
// forma canónica para no reportar falsos cambios.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}
const stable = (value) => JSON.stringify(canonical(value));
const fingerprint = (map) => crypto.createHash("sha256").update(stable(map)).digest("hex");

function hasInfra(map) {
  return Object.values(map || {}).some((s) => s && (s.status === 429 || s.status === 0));
}

/**
 * Copia el mapa sin las muestras de infraestructura (429/inaccesible).
 * Permite comparar/detectar cambios aunque el original esté parcialmente
 * rate-limited, en vez de descartar toda la observación.
 */
function withoutInfra(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    if (v && v.status !== 429 && v.status !== 0) out[k] = v;
  }
  return out;
}

/** Diferencia dos mapas: agregados, cambiados, removidos y la lista de diffs. */
function diff(prev, next) {
  const added = [];
  const changed = [];
  const diffs = [];
  for (const label of Object.keys(next || {})) {
    if (!(label in (prev || {}))) {
      added.push(label);
      diffs.push({ label, before: null, after: next[label] });
    } else if (stable(prev[label]) !== stable(next[label])) {
      changed.push(label);
      diffs.push({ label, before: prev[label], after: next[label] });
    }
  }
  const removed = Object.keys(prev || {}).filter((l) => !(l in (next || {})));
  return { added, changed, removed, diffs };
}

module.exports = { canonical, stable, fingerprint, hasInfra, withoutInfra, diff };

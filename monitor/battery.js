/**
 * Batería de vigilancia: la misma sonda de `reto2-investigacion/scripts/vigilancia.py`
 * portada a JS, para correrla desde una función serverless.
 *
 * Cada entrada es [etiqueta, mensaje] con el control ya calculado (ISO 7064).
 * `null` significa `POST /__reset` (los resets son implícitos en la secuencia).
 */
"use strict";

const crypto = require("crypto");
const dominio = require("../reemplazo/src/domain");

const c = (body) => `${body};${dominio.control(body)}`;

const BATERIA = [
  ["reset", null],
  ["PING", "PING;64"],
  ["PING-ignore", "PING;abc"],
  ["E103", "PING"],
  ["E104", "PING;"],
  ["E201", "ALTA;Mateo;003"],
  ["E202", "ALTA;Mateo;03"],
  ["E301", c("SALDOS;x")],
  ["E301-sug", c("TRANSFERIR;x")],
  ["ALTA", c("ALTA;A")],
  ["ALTA2", c("ALTA;B")],
  ["CONSULTA", c("CONSULTA;AC-0001")],
  ["DEPOSITO", c("DEPOSITO;AC-0001;100")],
  ["SALDO", c("CONSULTA;AC-0001")],
  ["T-ok", c("TRANSFER;AC-0001;AC-0002;50")],
  ["T-limite", c("TRANSFER;AC-0001;AC-0002;100001")],
  ["T-saldo", c("TRANSFER;AC-0001;AC-0002;101")],
  ["T-mismo", c("TRANSFER;AC-0001;AC-0001;10")],
  ["T-inexistente", c("TRANSFER;AC-0001;AC-9999;10")],
  ["T-monto", c("TRANSFER;AC-0001;AC-0002;0")],
  ["ANULA-op", c("DEPOSITO;AC-0001;1")],
  ["ANULA", c("ANULA;OP-0001")],
  ["E402", c("ANULA;OP-9999")],
  ["reset2", null],
  ["bloqueo-1", c("ALTA;A")],
  ["bloqueo-2", c("ALTA;B")],
  ["bloqueo-3", c("DEPOSITO;AC-0001;100")],
  ["falta1", c("TRANSFER;AC-0001;AC-0002;101")],
  ["falta2", c("TRANSFER;AC-0001;AC-0002;101")],
  ["falta3", c("TRANSFER;AC-0001;AC-0002;101")],
  ["E510", c("TRANSFER;AC-0001;AC-0002;101")],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(base, token, path, body, timeoutMs, tries = 3) {
  let lastErr = "";
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(base + path, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        parsed = text;
      }
      if (res.status === 429 && i < tries - 1) {
        await sleep(1000 * (i + 1));
        continue;
      }
      return { status: res.status, response: parsed };
    } catch (e) {
      lastErr = String(e && e.message);
      await sleep(1000 * (i + 1));
    }
  }
  return { status: 0, response: "unreachable", error: lastErr };
}

async function runBattery(base, token, { sleepMs = 100, timeoutMs = 20000 } = {}) {
  const foto = {};
  for (const [label, m] of BATERIA) {
    if (m === null) {
      await request(base, token, "/__reset", null, timeoutMs);
      foto[label] = { status: 200, response: "reset" };
    } else {
      foto[label] = await request(base, token, "/msg", { m }, timeoutMs);
    }
    if (sleepMs) await sleep(sleepMs);
  }
  return foto;
}

async function health(base, token, timeoutMs = 15000) {
  try {
    const res = await fetch(base + "/health", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: res.status === 200, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e && e.message) };
  }
}

// Postgres jsonb no preserva el orden de claves: comparar/hashear requiere
// una forma canónica para no reportar falsos cambios.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}

function stable(value) {
  return JSON.stringify(canonical(value));
}

function diffLabels(a, b) {
  const labels = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const out = [];
  for (const label of labels) {
    if (stable(a?.[label]) !== stable(b?.[label])) {
      out.push({ label, before: a?.[label] ?? null, after: b?.[label] ?? null });
    }
  }
  return out;
}

function fingerprint(foto) {
  return crypto.createHash("sha256").update(stable(foto)).digest("hex");
}

module.exports = { BATERIA, runBattery, health, diffLabels, fingerprint, canonical, stable };
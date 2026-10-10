#!/usr/bin/env node
/** Sonda puntual v2 (saldo, E510, HALT, NOTAS). Ritmo bajo. Uso interno. */
"use strict";
const observe = require("../monitor/observe.js");
const { refControl } = require("../monitor/probes.js");

const U = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
const T = process.env.TOKEN_CAJA_NEGRA || "";
const c = (b) => `${b};${refControl(b)}`;

async function call(path, body, label) {
  const r = await observe.requestRaw(U, T, "POST", path, body, 10000, 1, true);
  console.log((label || (body && body.m) || path).padEnd(34), "->", r.status, JSON.stringify(r.response));
  return r;
}
const reset = () => call("/__reset", null, "reset");
const msg = (b, label) => call("/msg", { m: c(b) }, label || b);

(async () => {
  console.log("=== A) formato de saldo ===");
  await reset();
  await msg("ALTA;A");
  await msg("DEPOSITO;AC-0001;100");
  await msg("CONSULTA;AC-0001", "CONSULTA tras dep 100");
  await msg("DEPOSITO;AC-0001;250000");
  await msg("CONSULTA;AC-0001", "CONSULTA tras dep 250000");
  await msg("DEPOSITO;AC-0001;1");
  await msg("CONSULTA;AC-0001", "CONSULTA tras dep 1");

  console.log("=== B) TRANSFER y saldo ===");
  await reset();
  await msg("ALTA;A"); await msg("ALTA;B");
  await msg("DEPOSITO;AC-0001;100000");
  await msg("CONSULTA;AC-0001", "saldo A pre-transfer");
  await msg("TRANSFER;AC-0001;AC-0002;50000", "TRANSFER 50000");
  await msg("CONSULTA;AC-0001", "saldo A post");
  await msg("CONSULTA;AC-0002", "saldo B post");

  console.log("=== C) E510 / intentos ===");
  await reset();
  await msg("ALTA;A"); await msg("ALTA;B");
  await msg("DEPOSITO;AC-0001;1000000");
  await msg("TRANSFER;AC-0001;AC-0002;100001", "fallo 1");
  await msg("TRANSFER;AC-0001;AC-0002;100001", "fallo 2");
  await msg("TRANSFER;AC-0001;AC-0002;100001", "fallo 3");
  await msg("TRANSFER;AC-0001;AC-0002;10", "post-3 fallos (E510?)");
  await msg("TRANSFER;AC-0001;AC-0002;10", "otra vez");

  console.log("=== D) HALT ===");
  await reset();
  await msg("ALTA;A");
  await msg("HALT;AC-0001", "HALT;AC-0001");
  await msg("HALT;AC-0001;x", "HALT 3 segs");
  await msg("HALT;AC-0001;100", "HALT con monto");

  console.log("=== E) NOTAS ===");
  await reset();
  await msg("ALTA;A");
  await msg("NOTAS;AC-0001", "NOTAS;AC-0001");
  await msg("NOTAS;AC-0001;x", "NOTAS 3 segs");
  await msg("NOTAS;AC-0001;100", "NOTAS con monto");

  console.log("=== F) aridad HALT/NOTAS (1 seg) ===");
  await msg("HALT", "HALT sin control");
  await msg("NOTAS", "NOTAS sin control");
})().catch((e) => { console.error("ERR", e.stack || e); process.exit(1); });

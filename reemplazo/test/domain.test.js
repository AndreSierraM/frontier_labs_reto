/**
 * Pruebas unitarias del dominio puro (sin red).
 *   node test/domain.test.js
 */
"use strict";

const assert = require("assert");
const d = require("../src/domain");

let n = 0;
const test = (nombre, fn) => {
  try { fn(); n++; console.log(`  ok  ${nombre}`); }
  catch (e) { console.error(`FALLA ${nombre}\n      ${e.message}`); process.exitCode = 1; }
};

console.log("control (ISO 7064 MOD 97-10)");
for (const [cuerpo, esperado] of [
  ["CONSULTA;AC-0001", "14"],
  ["ALTA;Lucia", "82"],
  ["ALTA;Mateo", "3"],
  ["DEPOSITO;AC-0001;250000", "86"],
  ["TRANSFER;AC-0001;AC-0002;40000", "86"],
  ["SALDOS;A", "53"],
  ["SALDOS;X", "91"],
]) {
  test(`control(${cuerpo}) === ${esperado}`, () => assert.strictEqual(d.control(cuerpo), esperado));
}

console.log("\nparseo / integridad");
const st = () => d.freshState();
test("sin ';' -> E103", () => assert.strictEqual(d.processMessage(st(), "PING").code, "E103"));
test("segmento vacío -> E104", () => assert.strictEqual(d.processMessage(st(), "PING;").code, "E104"));
test("control mal formado -> E201", () => assert.strictEqual(d.processMessage(st(), "ALTA;Mateo;003").code, "E201"));
test("control inválido -> E202", () => assert.strictEqual(d.processMessage(st(), "ALTA;Mateo;03").code, "E202"));
test("PING ignora control", () => assert.deepStrictEqual(d.processMessage(st(), "PING;abc").ok, { pong: true }));
test("PING aridad -> E302", () => assert.strictEqual(d.processMessage(st(), "PING;a;b").code, "E302"));

console.log("\ncomandos y estado");
test("ALTA crea AC-0001", () => {
  const s = st();
  assert.deepStrictEqual(d.processMessage(s, "ALTA;A;" + d.control("ALTA;A")), { ok: { cuentaId: "AC-0001" }, status: 201 });
  assert.deepStrictEqual(d.processMessage(s, "ALTA;B;" + d.control("ALTA;B")), { ok: { cuentaId: "AC-0002" }, status: 201 });
});
test("DEPOSITO suma y crea OP-0001", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  const r = d.processMessage(s, "DEPOSITO;AC-0001;1000;" + d.control("DEPOSITO;AC-0001;1000"));
  assert.strictEqual(r.ok.operacionId, "OP-0001");
  assert.strictEqual(s.cuentas.get("AC-0001").saldo, 1000);
});
test("TRANSFER límite -> E506", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  d.processMessage(s, "ALTA;B;" + d.control("ALTA;B"));
  d.processMessage(s, "DEPOSITO;AC-0001;200000;" + d.control("DEPOSITO;AC-0001;200000"));
  assert.strictEqual(d.processMessage(s, "TRANSFER;AC-0001;AC-0002;100001;" + d.control("TRANSFER;AC-0001;AC-0002;100001")).code, "E506");
});
test("TRANSFER saldo -> E507", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  d.processMessage(s, "ALTA;B;" + d.control("ALTA;B"));
  assert.strictEqual(d.processMessage(s, "TRANSFER;AC-0001;AC-0002;10;" + d.control("TRANSFER;AC-0001;AC-0002;10")).code, "E507");
});
test("mismo origen/destino -> E304", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  assert.strictEqual(d.processMessage(s, "TRANSFER;AC-0001;AC-0001;10;" + d.control("TRANSFER;AC-0001;AC-0001;10")).code, "E304");
});
test("3 fallos -> E510 y depósito desbloquea", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  d.processMessage(s, "ALTA;B;" + d.control("ALTA;B"));
  for (let i = 0; i < 3; i++) d.processMessage(s, "TRANSFER;AC-0001;AC-0002;10;" + d.control("TRANSFER;AC-0001;AC-0002;10"));
  assert.strictEqual(d.processMessage(s, "TRANSFER;AC-0001;AC-0002;10;" + d.control("TRANSFER;AC-0001;AC-0002;10")).code, "E510");
  d.processMessage(s, "DEPOSITO;AC-0001;1;" + d.control("DEPOSITO;AC-0001;1"));
  assert.ok(d.processMessage(s, "TRANSFER;AC-0001;AC-0002;1;" + d.control("TRANSFER;AC-0001;AC-0002;1")).ok);
});
test("ANULA revierte depósito y es idempotente", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  d.processMessage(s, "DEPOSITO;AC-0001;1000;" + d.control("DEPOSITO;AC-0001;1000"));
  assert.deepStrictEqual(d.processMessage(s, "ANULA;OP-0001;" + d.control("ANULA;OP-0001")).ok, { ok: true, anulada: "OP-0001" });
  assert.strictEqual(s.cuentas.get("AC-0001").saldo, 0);
  assert.deepStrictEqual(d.processMessage(s, "ANULA;OP-0001;" + d.control("ANULA;OP-0001")).ok, { ok: false, motivo: "ya anulada" });
});
test("comando desconocido -> E301 con sugerencia", () => {
  assert.deepStrictEqual(d.processMessage(st(), "TRANSFERIR;x;" + d.control("TRANSFERIR;x")), { code: "E301", sugerencia: "TRANSFER" });
});

console.log("\nregresión · contrato v2 (incidente 2026-10-17T22:32Z)");
// El incidente solo aportó ruido de observación (contadores/secuencia
// contaminados por observadores concurrentes), no comportamiento nuevo. Estos
// casos fijan el contrato v2 y fallarían si alguien "adaptara" el reemplazo a
// los valores contaminados del monitor.
const esperado = (s, msg) => {
  const r = d.processMessage(s, msg);
  if (!r.code) return { status: r.status || 200, body: r.ok };
  const [status, body] = d.ERRORES[r.code];
  return { status, body: r.intentos === undefined ? body : { ...body, intentos: r.intentos } };
};

test("DEPOSITO sin ALTA -> 404 E401 (el monto no crea la cuenta)", () => {
  assert.deepStrictEqual(esperado(st(), "DEPOSITO;AC-0001;1000000000;46"),
    { status: 404, body: { error: "E401", mensaje: "cuenta inexistente" } });
});
test("DEPOSITO con ALTA -> 200 OP-0001", () => {
  const s = st();
  assert.deepStrictEqual(esperado(s, "ALTA;A;62"), { status: 201, body: { cuentaId: "AC-0001" } });
  assert.deepStrictEqual(esperado(s, "DEPOSITO;AC-0001;1000000000;46"),
    { status: 200, body: { status: "recieved", operacionId: "OP-0001" } });
});
test("DEPOSITO monto 0 -> 400 E303 antes de validar la cuenta", () => {
  assert.deepStrictEqual(esperado(st(), "DEPOSITO;AC-0001;0;31"),
    { status: 400, body: { error: "E303", mensaje: "monto inválido" } });
});
test("DEPOSITO monto de 11 dígitos -> 400 E303", () => {
  assert.deepStrictEqual(esperado(st(), "DEPOSITO;AC-0001;10000000000;63"),
    { status: 400, body: { error: "E303", mensaje: "monto inválido" } });
});
test("secuencia v2: saldo decimal y E506 solo con nombres distintos", () => {
  const s = st();
  assert.deepStrictEqual(esperado(s, "ALTA;A;62"), { status: 201, body: { cuentaId: "AC-0001" } });
  assert.deepStrictEqual(esperado(s, "ALTA;B;59"), { status: 201, body: { cuentaId: "AC-0002" } });
  assert.deepStrictEqual(esperado(s, "DEPOSITO;AC-0001;1000000;51"),
    { status: 200, body: { status: "recieved", operacionId: "OP-0001" } });
  assert.deepStrictEqual(esperado(s, "CONSULTA;AC-0001;14"),
    { status: 200, body: { cuenta_id: "AC-0001", saldo: "10000.00" } });
  assert.deepStrictEqual(esperado(s, "TRANSFER;AC-0001;AC-0002;50000;59"),
    { status: 200, body: { status: "recieved", operacionId: "OP-0002" } });
  assert.deepStrictEqual(esperado(s, "TRANSFER;AC-0001;AC-0002;50001;56"),
    { status: 422, body: { error: "E506", mensaje: "límite excedido" } });
});
test("secuencia v2: 3 E507 -> E510 423 con intentos", () => {
  const s = st();
  assert.deepStrictEqual(esperado(s, "ALTA;A;62"), { status: 201, body: { cuentaId: "AC-0001" } });
  assert.deepStrictEqual(esperado(s, "ALTA;B;59"), { status: 201, body: { cuentaId: "AC-0002" } });
  assert.deepStrictEqual(esperado(s, "DEPOSITO;AC-0001;100;82"),
    { status: 200, body: { status: "recieved", operacionId: "OP-0001" } });
  for (let i = 0; i < 3; i++)
    assert.deepStrictEqual(esperado(s, "TRANSFER;AC-0001;AC-0002;101;21"),
      { status: 422, body: { error: "E507", mensaje: "saldo insuficiente" } });
  assert.deepStrictEqual(esperado(s, "TRANSFER;AC-0001;AC-0002;101;21"),
    { status: 423, body: { error: "E510", mensaje: "cuenta bloqueada", intentos: 1 } });
});

console.log(`\n${n} pruebas OK${process.exitCode ? " (con fallas)" : ""}`);

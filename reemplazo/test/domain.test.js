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
test("E506 expone el mensaje vigente", () => {
  assert.deepStrictEqual(d.ERRORES.E506, [
    422,
    { error: "E506", mensaje: "limite superado en el servicio" },
  ]);
});
test("TRANSFER 100001 -> E506 con mensaje nuevo", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  d.processMessage(s, "ALTA;B;" + d.control("ALTA;B"));
  d.processMessage(s, "DEPOSITO;AC-0001;200000;" + d.control("DEPOSITO;AC-0001;200000"));
  const r = d.processMessage(
    s,
    "TRANSFER;AC-0001;AC-0002;100001;" + d.control("TRANSFER;AC-0001;AC-0002;100001")
  );
  assert.strictEqual(r.code, "E506");
  assert.strictEqual(d.ERRORES.E506[1].mensaje, "limite superado en el servicio");
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

console.log(`\n${n} pruebas OK${process.exitCode ? " (con fallas)" : ""}`);

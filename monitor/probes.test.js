"use strict";

const test = require("node:test");
const assert = require("node:assert");

test("refControl reproduce los valores conocidos de ISO 7064", () => {
  const probes = require("./probes");
  assert.strictEqual(probes.refControl("CONSULTA;AC-0001"), "14");
  assert.strictEqual(probes.refControl("ALTA;Lucia"), "82");
  assert.strictEqual(probes.refControl("DEPOSITO;AC-0001;250000"), "86");
  assert.strictEqual(probes.refControl("TRANSFER;AC-0001;AC-0002;40000"), "86");
  assert.strictEqual(probes.refControl("SALDOS;X"), "91");
});

test("probes.js no carga el dominio del reemplazo", () => {
  require("./probes");
  assert.ok(
    !Object.keys(require.cache).some((k) => k.includes("reemplazo/src/domain"))
  );
});

test("el catálogo coincide con la instantánea dorada", () => {
  const probes = require("./probes");
  const c = probes.catalog();
  assert.strictEqual(c.battery.length, 45);
  const golden = require("./__snapshots__/probes.json");
  assert.deepStrictEqual(
    { battery: c.battery, discovery: c.discovery, routes: c.routes, all: c.all },
    golden
  );
});

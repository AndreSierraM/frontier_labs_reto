"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { isComplete, anchorsOk, cleanRun } = require("./guard");

const ok = (response, status = 200) => ({ status, response });

test("isComplete exige todas las sondas", () => {
  assert.strictEqual(isComplete({ a: ok(1), b: ok(2) }, 2), true);
  assert.strictEqual(isComplete({ a: ok(1) }, 2), false);
  assert.strictEqual(isComplete(null, 1), false);
});

test("anchorsOk acepta una corrida limpia de la batería", () => {
  const samples = {
    reset: ok("reset"),
    reset2: ok("reset"),
    ALTA: ok({ cuentaId: "AC-0001" }, 201),
    ALTA2: ok({ cuentaId: "AC-0002" }, 201),
    "bloqueo-1": ok({ cuentaId: "AC-0001" }, 201),
    "bloqueo-2": ok({ cuentaId: "AC-0002" }, 201),
    "lim-A": ok({ cuentaId: "AC-0001" }, 201),
    "lim-B": ok({ cuentaId: "AC-0002" }, 201),
  };
  assert.strictEqual(anchorsOk(samples), true);
});

test("anchorsOk rechaza el reset fallido (estado arrastrado)", () => {
  const samples = {
    ALTA: ok({ cuentaId: "AC-0003" }, 201),
    ALTA2: ok({ cuentaId: "AC-0004" }, 201),
  };
  assert.strictEqual(anchorsOk(samples), false);
});

test("anchorsOk rechaza reset con 429", () => {
  const samples = { reset: { status: 429, response: "rate-limit" } };
  assert.strictEqual(anchorsOk(samples), false);
});

test("cleanRun: completa y coherente -> true", () => {
  const samples = {
    reset: ok("reset"),
    ALTA: ok({ cuentaId: "AC-0001" }, 201),
    ALTA2: ok({ cuentaId: "AC-0002" }, 201),
  };
  assert.strictEqual(cleanRun(samples, 3), true);
});

test("cleanRun: corrida parcial -> false (no debe fusionarse)", () => {
  const samples = {
    reset: ok("reset"),
    ALTA: ok({ cuentaId: "AC-0001" }, 201),
  };
  assert.strictEqual(cleanRun(samples, 3), false);
});

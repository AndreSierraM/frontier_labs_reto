"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { canonical, stable, fingerprint, hasInfra, withoutInfra, diff } = require("./compare");

test("canonical ordena claves de forma independiente (anidado)", () => {
  assert.deepStrictEqual(canonical({ b: 1, a: 2 }), { a: 2, b: 1 });
  assert.strictEqual(stable({ b: 1, a: 2 }), stable({ a: 2, b: 1 }));
  assert.deepStrictEqual(canonical({ b: { d: 1, c: 2 }, a: 2 }), { a: 2, b: { c: 2, d: 1 } });
  assert.strictEqual(
    stable({ b: { d: 1, c: 2 }, a: 2 }),
    stable({ a: 2, b: { c: 2, d: 1 } })
  );
});

test("diff reporta added/cambiados/removidos y etiquetas", () => {
  const prev = {
    a: { status: 200, response: "x" },
    b: { status: 200, response: "y" },
  };
  const next = {
    a: { status: 200, response: "z" },
    c: { status: 200, response: "w" },
  };
  const d = diff(prev, next);
  assert.deepStrictEqual(d.added, ["c"]);
  assert.deepStrictEqual(d.changed, ["a"]);
  assert.deepStrictEqual(d.removed, ["b"]);
  assert.deepStrictEqual(d.diffs.map((x) => x.label), ["a", "c"]);
  assert.deepStrictEqual(d.diffs[0].before, prev.a);
  assert.deepStrictEqual(d.diffs[0].after, next.a);
});

test("fingerprint idéntico para claves reordenadas", () => {
  const a = { one: { status: 200, response: { x: 1, y: 2 } }, two: { status: 201 } };
  const b = { two: { status: 201 }, one: { response: { y: 2, x: 1 }, status: 200 } };
  assert.strictEqual(fingerprint(a), fingerprint(b));
});

test("hasInfra detecta 429 e inaccesible (status 0)", () => {
  assert.strictEqual(hasInfra({ x: { status: 429, response: "rate" } }), true);
  assert.strictEqual(hasInfra({ x: { status: 0, response: "unreachable" } }), true);
  assert.strictEqual(hasInfra({ x: { status: 200, response: "ok" } }), false);
  assert.strictEqual(hasInfra({}), false);
});

test("withoutInfra quita solo las muestras de infraestructura", () => {
  const m = { a: { status: 200 }, b: { status: 429 }, c: { status: 0 }, d: { status: 404 } };
  assert.deepStrictEqual(withoutInfra(m), { a: { status: 200 }, d: { status: 404 } });
  assert.deepStrictEqual(withoutInfra({}), {});
  assert.deepStrictEqual(withoutInfra(null), {});
});

import { test } from "node:test";
import assert from "node:assert";
import { gate } from "../lib/verify.mjs";

test("mapas idénticos -> ok true", () => {
  const reference = { a: { status: 200, response: "x" } };
  const res = gate({ reference, candidate: { a: { status: 200, response: "x" } } });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.inconclusive, false);
  assert.strictEqual(res.divergences.length, 0);
  assert.strictEqual(res.mapDivergences.length, 0);
});

test("un valor cambiado -> ok false con 1 divergencia", () => {
  const reference = { a: { status: 200, response: "x" } };
  const candidate = { a: { status: 200, response: "y" } };
  const res = gate({ reference, candidate });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.inconclusive, false);
  assert.strictEqual(res.divergences.length, 1);
});

test("infra en la referencia -> inconclusive true", () => {
  const res = gate({ reference: { a: { status: 429 } }, candidate: { a: { status: 200 } } });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.inconclusive, true);
  assert.strictEqual(res.divergences.length, 0);
});

test("infra en el candidato -> inconclusive true", () => {
  const res = gate({ reference: { a: { status: 200 } }, candidate: { a: { status: 0 } } });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.inconclusive, true);
  assert.strictEqual(res.divergences.length, 0);
});

test("divergencia de mapa contada cuando ambos mapas presentes", () => {
  const reference = { a: { status: 200 } };
  const candidate = { a: { status: 200 } };
  const referenceMap = { m1: { status: 200, response: "x" } };
  const candidateMap = { m1: { status: 200, response: "y" } };
  const res = gate({ reference, candidate, referenceMap, candidateMap });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.mapDivergences.length, 1);
  assert.strictEqual(res.divergences.length, 0);
});

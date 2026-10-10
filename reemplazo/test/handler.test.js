"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const http = require("node:http");
const { createMemoryStorage } = require("../src/storage");
const { createHandler } = require("../src/server");

function start(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

test("handlers con distinto token quedan aislados", async (t) => {
  const a = await start(createHandler(createMemoryStorage(), { token: "token-a" }));
  const b = await start(createHandler(createMemoryStorage(), { token: "token-b" }));
  t.after(() => new Promise((resolve) => a.server.close(resolve)));
  t.after(() => new Promise((resolve) => b.server.close(resolve)));

  const onA = await fetch(a.base + "/health", { headers: { Authorization: "Bearer token-a" } });
  assert.equal(onA.status, 200);
  assert.deepEqual(await onA.json(), { ok: true });

  const rejected = await fetch(b.base + "/health", { headers: { Authorization: "Bearer token-a" } });
  assert.equal(rejected.status, 401);
  assert.deepEqual(await rejected.json(), { error: "E001", mensaje: "no autorizado" });

  const onB = await fetch(b.base + "/health", { headers: { Authorization: "Bearer token-b" } });
  assert.equal(onB.status, 200);
  assert.deepEqual(await onB.json(), { ok: true });
});

test("maxBody explícito se respeta", async (t) => {
  const { server, base } = await start(
    createHandler(createMemoryStorage(), { token: "t", maxBody: 16 })
  );
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const res = await fetch(base + "/msg", {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: "aaaaaaaaaaaaaaaaaaaa",
  });
  assert.equal(res.status, 413);
  const body = await res.json();
  assert.equal(body.error, "E101");
});

test("onRequest captura la petición (m) y la respuesta exacta", async (t) => {
  const seen = [];
  const { server, base } = await start(
    createHandler(createMemoryStorage(), { token: "t", onRequest: (r) => seen.push(r) })
  );
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const m = `ALTA;A;${require("../src/domain").control("ALTA;A")}`;
  const res = await fetch(base + "/msg", {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify({ m }),
  });
  assert.equal(res.status, 201);
  await new Promise((r) => setTimeout(r, 25));
  const msg = seen.find((x) => x.path === "/msg");
  assert.ok(msg, "se registró /msg");
  assert.equal(msg.m, m);
  assert.deepEqual(msg.response, { cuentaId: "AC-0001" });
});

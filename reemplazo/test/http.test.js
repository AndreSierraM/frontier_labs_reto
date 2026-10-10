"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const http = require("node:http");
const { createMemoryStorage } = require("../src/storage");
const { createHandler } = require("../src/server");
const { control } = require("../src/domain");

const server = http.createServer(
  createHandler(createMemoryStorage(), { token: "local-http-test" })
);

test("contrato HTTP local: auth, rutas, mensajes y reset", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeIdleConnections?.();
  }));

  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, options = {}) {
    return fetch(base + path, {
      ...options,
      headers: { Authorization: "Bearer local-http-test", ...options.headers },
      signal: AbortSignal.timeout(5000),
    });
  }
  async function check(path, options, status, body) {
    const response = await request(path, options);
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), body);
  }
  async function message(body, status, response) {
    await check("/msg", {
      method: "POST",
      body: JSON.stringify({ m: `${body};${control(body)}` }),
    }, status, response);
  }

  await check("/health", {}, 200, { ok: true });
  for (const authorization of ["", "Bearer wrong", "bearer local-http-test"]) {
    await check("/health", { headers: { Authorization: authorization } },
      401, { error: "E001", mensaje: "no autorizado" });
  }
  await check("/msg/", { method: "POST" }, 404,
    { error: "E404", mensaje: "ruta desconocida" });
  const head = await request("/health", { method: "HEAD" });
  assert.equal(head.status, 404);
  assert.equal(await head.text(), "");
  // fetch oculta el cuerpo en HEAD: comprobar a nivel TCP que son 0 bytes,
  // como el original (HEAD /health -> 404 sin cuerpo).
  const rawHead = await new Promise((resolve, reject) => {
    let bytes = 0;
    const req = http.request(
      base + "/health",
      { method: "HEAD", headers: { Authorization: "Bearer local-http-test" } },
      (res) => {
        res.on("data", (c) => { bytes += c.length; });
        res.on("end", () => resolve({ status: res.statusCode, bytes }));
      });
    req.on("error", reject);
    req.end();
  });
  assert.equal(rawHead.status, 404);
  assert.equal(rawHead.bytes, 0);
  await check("/msg", { method: "POST", body: "not json" }, 400,
    { error: "E100", mensaje: "json inválido" });
  await check("/msg", { method: "POST", body: JSON.stringify({ m: 123 }) }, 400,
    { error: "E102", mensaje: "falta m" });

  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("PING", 200, { pong: true });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("DEPOSITO;AC-0001;100", 200,
    { status: "recieved", operacionId: "OP-0001" });
  await message("CONSULTA;AC-0001", 200, { cuenta_id: "AC-0001", saldo: "1.00" });
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("CONSULTA;AC-0001", 404,
    { error: "E401", mensaje: "cuenta inexistente" });
  await message("ALTA;B", 201, { cuentaId: "AC-0001" });
});

test("v2: saldo decimal, E510 423+intentos, HALT (E520) y NOTAS", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeIdleConnections?.();
  }));

  const base = `http://127.0.0.1:${server.address().port}`;
  async function check(path, options, status, body) {
    const response = await fetch(base + path, {
      ...options,
      headers: { Authorization: "Bearer local-http-test", ...options.headers },
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), body);
  }
  async function message(body, status, response) {
    await check("/msg", {
      method: "POST",
      body: JSON.stringify({ m: `${body};${control(body)}` }),
    }, status, response);
  }

  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("NOTAS", 200, {
    notas: [
      {
        id: "N-01",
        texto:
          "Pendiente de la migración: exporta la documentación completa con POST /internal/export-docs y tu token en Authorization: Bearer.",
      },
    ],
  });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("DEPOSITO;AC-0001;250000", 200,
    { status: "recieved", operacionId: "OP-0001" });
  await message("CONSULTA;AC-0001", 200, { cuenta_id: "AC-0001", saldo: "2500.00" });
  await message("HALT;AC-0001", 409, {
    error: "E520",
    mensaje: "operación destructiva: detiene el servicio; reenvía con confirmación",
  });
  await message("ALTA;B", 201, { cuentaId: "AC-0002" });
  for (let i = 0; i < 3; i++) {
    await message("TRANSFER;AC-0001;AC-0002;100001", 422,
      { error: "E506", mensaje: "límite excedido" });
  }
  await message("TRANSFER;AC-0001;AC-0002;10", 423,
    { error: "E510", mensaje: "cuenta bloqueada", intentos: 1 });
  await message("TRANSFER;AC-0001;AC-0002;10", 423,
    { error: "E510", mensaje: "cuenta bloqueada", intentos: 2 });
  // v2: el umbral E506 bajó a 50000 (50000 pasa, 50001 no).
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("ALTA;B", 201, { cuentaId: "AC-0002" });
  await message("DEPOSITO;AC-0001;1000000", 200,
    { status: "recieved", operacionId: "OP-0001" });
  await message("TRANSFER;AC-0001;AC-0002;50000", 200,
    { status: "recieved", operacionId: "OP-0002" });
  await message("TRANSFER;AC-0001;AC-0002;50001", 422,
    { error: "E506", mensaje: "límite excedido" });
  // v2: match de comando ASCII-only (pıng con i sin punto NO es PING).
  await check("/msg", { method: "POST", body: JSON.stringify({ m: "pıng;XX" }) }, 400,
    { error: "E201", mensaje: "control mal formado" });
  await check("/msg", { method: "POST", body: JSON.stringify({ m: `pıng;${control("pıng")}` }) }, 400,
    { error: "E301", mensaje: "comando desconocido ", sugerencia: "PING" });
  // v2: HALT;1 apaga el servicio (503 E599) hasta __reset.
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("HALT;1", 503, { error: "E599", mensaje: "service halted" });
  await message("PING", 503, { error: "E599", mensaje: "service halted" });
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("PING", 200, { pong: true });
});

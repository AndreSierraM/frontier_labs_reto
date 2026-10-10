"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

process.env.TOKEN_API_ENTRYPOINT = "local-http-test";
const { server } = require("../src/server");
const { control } = require("../src/domain");

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
  const http = require("node:http");
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
  await message("CONSULTA;AC-0001", 200, { cuenta_id: "AC-0001", saldo: 100 });
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("CONSULTA;AC-0001", 404,
    { error: "E401", mensaje: "cuenta inexistente" });
  await message("ALTA;B", 201, { cuentaId: "AC-0001" });

  // E506: mensaje vigente del servicio (sin tilde) y umbral exacto.
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("ALTA;B", 201, { cuentaId: "AC-0002" });
  await message("TRANSFER;AC-0001;AC-0002;100001", 422,
    { error: "E506", mensaje: "limite superado en el servicio" });
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("ALTA;B", 201, { cuentaId: "AC-0002" });
  await message("TRANSFER;AC-0001;AC-0002;100000", 422,
    { error: "E507", mensaje: "saldo insuficiente" });
  await check("/__reset", { method: "POST" }, 200, { ok: true });
  await message("ALTA;A", 201, { cuentaId: "AC-0001" });
  await message("DEPOSITO;AC-0001;200000", 200,
    { status: "recieved", operacionId: "OP-0001" });
});

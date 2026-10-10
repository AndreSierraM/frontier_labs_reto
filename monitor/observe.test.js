"use strict";

// Limiter rápido y backoff corto para que el test no espere.
process.env.MONITOR_RPS = "1000";
process.env.MONITOR_BACKOFF_MS = "10";

const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const { requestRaw, limiter } = require("./observe");

function start(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}
const baseOf = (server) => `http://127.0.0.1:${server.address().port}`;

test("requestRaw reintenta ante 429 (+ X-Frontier-Infra) y devuelve la respuesta buena", async () => {
  let hits = 0;
  const server = await start((req, res) => {
    hits++;
    res.setHeader("Content-Type", "application/json");
    if (hits === 1) {
      res.setHeader("x-frontier-infra", "rate-limit");
      res.statusCode = 429;
      res.end(JSON.stringify({ infra: "rate-limit" }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true }));
    }
  });
  try {
    const out = await requestRaw(baseOf(server), "t", "POST", "/msg", { m: "PING;1" }, 5000, 3);
    assert.strictEqual(out.status, 200);
    assert.deepStrictEqual(out.response, { ok: true });
    assert.ok(hits >= 2, `se esperaban >=2 intentos, hubo ${hits}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("el limitador espacia peticiones al ritmo configurado", async () => {
  limiter.reset();
  const t0 = Date.now();
  await limiter.acquire();
  await limiter.acquire();
  await limiter.acquire();
  const dt = Date.now() - t0;
  // 3 huecos: el 1.º inmediato, el 3.º a 2*minGap. Margen de 4 ms.
  assert.ok(dt >= 2 * limiter.minGapMs - 4, `dt=${dt} minGap=${limiter.minGapMs}`);
});

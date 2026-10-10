"use strict";

// Limiter rápido y backoff corto para que el test no espere.
process.env.MONITOR_RPS = "1000";
process.env.MONITOR_BACKOFF_MS = "10";

const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const { requestRaw, run, limiter } = require("./observe");

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

test("run tolera un 429 puntual y conserva el resto de la observación", async () => {
  let hits = 0;
  const server = await start((req, res) => {
    hits++;
    res.setHeader("Content-Type", "application/json");
    if (hits === 1) {
      res.statusCode = 429;
      res.end(JSON.stringify({ infra: "rate-limit" }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true }));
    }
  });
  try {
    const list = [
      { label: "a", method: "POST", path: "/msg", body: { m: "A" } },
      { label: "b", method: "POST", path: "/msg", body: { m: "B" } },
    ];
    const map = await run(baseOf(server), "t", list, {
      sleepMs: 0, tries: 1, infraRetries: 1, infraWaitMs: 5, throttle: false,
    });
    assert.strictEqual(map.a.status, 200);
    assert.strictEqual(map.b.status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("run aborta si el 429 es persistente (no agota la ventana)", async () => {
  const server = await start((req, res) => {
    res.statusCode = 429;
    res.end(JSON.stringify({ infra: "rate-limit" }));
  });
  try {
    const list = Array.from({ length: 10 }, (_, i) => ({
      label: `p${i}`, method: "POST", path: "/msg", body: { m: "X" },
    }));
    const map = await run(baseOf(server), "t", list, {
      sleepMs: 0, tries: 1, infraRetries: 0, infraAbortAfter: 3, throttle: false,
    });
    assert.strictEqual(Object.keys(map).length, 3);
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

#!/usr/bin/env node
/**
 * Diferencial COMPLETO: reproduce las 366 observaciones de `experimentos.jsonl`
 * (por secuencia, con reset) contra el ORIGINAL y el REEMPLAZO, y reporta
 * cualquier divergencia de status/cuerpo. Uso interno (no monitor/enjambre).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const observe = require("../monitor/observe.js");

const U = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
const T = process.env.TOKEN_CAJA_NEGRA || "";
const R = (process.env.REPL_URL || "").replace(/\/$/, "");
const RT = process.env.REPL_TOKEN || "";
const ROOT = path.resolve(__dirname, "..");

const log = fs.readFileSync(path.join(ROOT, "reto2-investigacion/experimentos.jsonl"), "utf8")
  .trim().split("\n").map((l) => JSON.parse(l));

const order = [];
const bySeq = {};
for (const e of log) {
  if (!bySeq[e.seq]) { bySeq[e.seq] = []; order.push(e.seq); }
  bySeq[e.seq].push(e);
}

function build() {
  const steps = [];
  for (const seq of order) {
    steps.push({ type: "reset", label: `reset:${seq}` });
    let sawAc1 = false;
    for (const e of bySeq[seq]) {
      const req = e.request || {};
      if (typeof req.m === "string") {
        // El log no registra algunos resets: volver a crear AC-0001 es señal de
        // estado fresco, así que reproducimos el __reset implícito.
        if (e.response && e.response.cuentaId === "AC-0001") {
          if (sawAc1) steps.push({ type: "reset", label: `reset(implicito)#${e.id}` });
          sawAc1 = true;
        }
        steps.push({ type: "msg", m: req.m, id: e.id, seq });
      } else if (req.path === "/__reset") {
        steps.push({ type: "reset", label: `reset#${e.id}`, id: e.id });
        sawAc1 = false;
      } else {
        steps.push({ type: "other", method: req.method || "GET", path: req.path || "/", id: e.id });
      }
    }
  }
  return steps;
}

async function call(base, token, step, throttle) {
  if (step.type === "reset") return observe.requestRaw(base, token, "POST", "/__reset", null, 10000, 1, throttle);
  if (step.type === "msg") return observe.requestRaw(base, token, "POST", "/msg", { m: step.m }, 10000, 1, throttle);
  return observe.requestRaw(base, token, step.method, step.path, null, 10000, 1, throttle);
}

(async () => {
  const steps = build();
  const diffs = [];
  await call(U, T, { type: "reset" }, true);
  await call(R, RT, { type: "reset" }, false);
  for (let i = 0; i < steps.length; i++) {
    const a = await call(U, T, steps[i], true);
    const b = await call(R, RT, steps[i], false);
    const sa = JSON.stringify([a.status, a.response]);
    const sb = JSON.stringify([b.status, b.response]);
    if (sa !== sb) diffs.push({ i, step: steps[i], orig: [a.status, a.response], repl: [b.status, b.response] });
    if ((i + 1) % 100 === 0) console.error(`...${i + 1}/${steps.length} diffs=${diffs.length}`);
  }
  const out = { at: new Date().toISOString(), n: steps.length, diffs: diffs.length, detail: diffs };
  fs.writeFileSync(path.join(ROOT, "reto2-investigacion/logs/watch-map/diff-full.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ n: steps.length, diffs: diffs.length }, null, 1));
  for (const d of diffs.slice(0, 50)) {
    console.log(`· step ${d.i} [${d.step.type}] ${d.step.label || d.step.m || d.step.path}`);
    console.log(`   orig: ${JSON.stringify(d.orig)}`);
    console.log(`   repl: ${JSON.stringify(d.repl)}`);
  }
})().catch((e) => { console.error("ERR", e.stack || e); process.exit(1); });

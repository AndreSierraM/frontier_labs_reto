const path = require("path");
const observe = require(path.join(__dirname, "monitor/observe.js"));
const probes = require(path.join(__dirname, "monitor/probes.js"));

const ORIG_URL = (process.env.URL_API_ENTRYPOINT || "").replace(/\/$/, "");
const ORIG_TOKEN = process.env.TOKEN_CAJA_NEGRA || "";
const REPL_URL = "https://frontier-labs-reto.vercel.app";
const REPL_TOKEN = process.env.TOKEN_API_ENTRYPOINT || "";

async function main() {
  const list = probes.catalog().battery;
  console.error(`[diff] ${list.length} sondas contra ORIGINAL y REEMPLAZO`);

  const orig = await observe.run(ORIG_URL, ORIG_TOKEN, list, { sleepMs: 0, concurrency: 1, throttle: true, infraRetries: 1, infraAbortAfter: 3 });
  const repl = await observe.run(REPL_URL, REPL_TOKEN, list, { sleepMs: 0, concurrency: 1, throttle: false, infraRetries: 0 });

  const divergences = [];
  for (const p of list) {
    const a = orig[p.label];
    const b = repl[p.label];
    if (!a || !b) continue;
    if (a.status !== b.status || JSON.stringify(a.response) !== JSON.stringify(b.response)) {
      divergences.push({ label: p.label, original: a, replacement: b });
    }
  }

  console.log(`\n=== ${divergences.length} DIVERGENCIAS ===\n`);
  for (const d of divergences) {
    console.log(`${d.label}:`);
    console.log(`  ORIG:  ${d.original.status} -> ${JSON.stringify(d.original.response)}`);
    console.log(`  REPL:  ${d.replacement.status} -> ${JSON.stringify(d.replacement.response)}`);
    console.log();
  }
}
main();

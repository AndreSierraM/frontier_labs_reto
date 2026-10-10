# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `api/` | Vercel serverless entrypoint; wires the HTTP handler to PostgreSQL storage | `api/index.js` |
| `reemplazo/` | Delivered executable package: pure domain + HTTP adapter + storage seam + tests + Dockerfile | `reemplazo/README.md` |
| `reto2-investigacion/` | Reverse-engineering research: Python clients, probes, spec, experiment log, caches, snapshots | `reto2-investigacion/README.md` |
| `frontier-reto-2/` | Official, unmodified challenge material (contract + 20 examples) | `frontier-reto-2/README.md`, `frontier-reto-2/pruebas/ejemplos.jsonl` |
| `docs/` | Current design docs, Systems Design deliverables (HTML/PDF), templates, and archived first map | `docs/README.md` |
| `public/` | Static deliverable copies (index + entregables) served by Vercel | `public/index.html`, `vercel.json` |
| `node_modules/` | Installed `pg` dependency tree (generated) | `package-lock.json` |
| `.vercel/` | Local Vercel project link (gitignored) | `.vercel/project.json`, `.gitignore` |
| `vercel.json` | Rewrite all routes to `/api/index`; cache headers for `/entregables/*` | `vercel.json` |
| `package.json` | Root manifest; declares only `pg` for the serverless function | `package.json` |
| `README.md` | Single entry point linking all sub-areas and run commands | `README.md` |
| `.env` | Real tokens/URL (gitignored, present in working tree) | `.env`, `.gitignore` |

### 2) Entry Points

- Main runtime entry: `reemplazo/src/server.js` (`main` in `reemplazo/package.json`; starts `http.createServer` when run directly).
- Secondary entry point(s): `api/index.js` — Vercel serverless handler composing `createHandler` with `createPostgresStorage`.
- Python research entries: `reto2-investigacion/scripts/client.py`, `verificar.py`, `validar.py`, `explorar.py`, `vigilancia.py`.
- Selection mechanism: Docker/local `CMD ["node", "src/server.js"]` (`reemplazo/Dockerfile`); Vercel `rewrites` route to `/api/index` (`vercel.json`). Root `package.json` declares **no** `main`/`scripts`.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| Domain (`reemplazo/src/domain.js`) | Control-digit math (ISO 7064), message parsing, state machine, guards, error catalog | HTTP, sockets, filesystem, DB |
| HTTP adapter (`reemplazo/src/server.js`) | Auth, routing, body-size limit, JSON parse, `x-req` header, response framing | Balance rules, ID normalization |
| Storage seam (`reemplazo/src/storage.js`) | Serialize/restore domain state; memory and Postgres adapters; `mutate`/`reset` contract | Business rules |
| Vercel composition (`api/index.js`) | Pool creation, storage selection, readiness/table creation | Duplicated domain logic |
| Research (`reto2-investigacion/scripts/`) | Probing, validation, surveillance, offline cracking history | Runtime delivery code |
| Docs / deliverables (`docs/`, `public/`) | Specifications, design docs, HTML/PDF outputs | Executable logic |

### 4) Naming and Organization Rules

- File naming: lowercase with dots for the domain seam (`domain.js`, `server.js`, `storage.js`, `domain.test.js`, `http.test.js`); Python scripts are lowercase `snake_case` (`validar.py`, `prueba_diferencial.py`, `bloqueo_conteo.py`).
- Directory organization: by concern/layer, not by feature — `src/` (runtime), `test/` (tests), `scripts/` (research tools), `scripts/historico/` (superseded attempts).
- Import conventions: CommonJS relative `require` (`require("./domain")`, `require("../reemplazo/src/server")`); Python scripts insert their own directory on `sys.path` to import `control` (e.g. `validar.py:17-18`).
- No path aliases and no barrel/index re-exports.

### 5) Evidence

- Root tree: `docs/codebase/.codebase-scan.txt` (DIRECTORY TREE)
- Entry config: `reemplazo/package.json`, `reemplazo/Dockerfile`, `vercel.json`, `api/index.js`
- Key modules: `reemplazo/src/domain.js`, `reemplazo/src/server.js`, `reemplazo/src/storage.js`
- Historical map (do not use as current): `docs/archivo/mapa-inicial/STRUCTURE.md`

## Extended Sections (Optional)

### Sub-area deep map

```text
reemplazo/
  src/domain.js          # pure state machine + ISO 7064 control
  src/server.js          # HTTP adapter + .env loader + local server
  src/storage.js         # memory + Postgres state adapters
  test/domain.test.js    # 21 in-process domain tests
  test/http.test.js      # node:test HTTP smoke test
  Dockerfile             # node:20-alpine, copies package.json + src/ only

reto2-investigacion/
  scripts/               # active clients, probes, validators
  scripts/historico/     # six superseded offline control-crack attempts
  data/                  # (body, control) pairs and caches
  logs/                  # fingerprint.md, validacion.json, snapshots/
  SPEC.md, BITACORA.md, experimentos.jsonl (347 lines)
```

Note: `reto2-investigacion/scripts/probe_recon.py`, `probe_xreq.py`, `collect_*.py`, and `crack_control_bruteforce.py` depend on an external `/tmp/api` module and are **not reproducible from a clean checkout** (`reto2-investigacion/scripts/README.md`).

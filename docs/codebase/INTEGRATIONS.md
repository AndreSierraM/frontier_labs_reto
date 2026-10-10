# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| PostgreSQL (Neon) | DB | Persist replacement state when deployed on Vercel | Connection string (`DATABASE_URL`) | high (Vercel path only) | `api/index.js:17-21`, `reemplazo/src/storage.js:61-97` |
| Vercel | Hosting / serverless platform | Serve static deliverables and run `/api/index` | Platform-managed; project link in `.vercel/project.json` | high | `vercel.json`, `.vercel/project.json`, `public/` |
| Original black-box service | External HTTP API | Research/reverse-engineering only (never called by the runtime) | Bearer `TOKEN_CAJA_NEGRA` (`cn-p-...`) | none at runtime | `reto2-investigacion/scripts/client.py`, `frontier-reto-2/README.md` |
| Rate-limit infrastructure | Edge proxy on the original | Throttles research requests (10 req/s, 8000/day) | N/A | low | `frontier-reto-2/README.md` "Reglas", `SPEC.md` I-11 |
| Playwright / Chrome | Tooling | Regenerate PDF deliverables from HTML | Local browser | low | `docs/README.md` regeneration snippet |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| Postgres table `estado` | Single-row JSONB state + `xreq` counter | `createPostgresStorage` | One row serialized under `FOR UPDATE`; whole-state read/write on every mutation | `storage.js:63-97`, `api/index.js` |
| In-memory `Map` state | Local/dev state, lost on restart | `createMemoryStorage` | No durability; not shared across instances | `storage.js:41-59` |
| Filesystem JSONL/JSON caches | Research datasets and logs | Python scripts | Not evidence of new rules; must not be reordered/converted | `reto2-investigacion/data/`, `reto2-investigacion/logs/` |

### 3) Secrets and Credentials Handling

- Credential sources: process env or `.env` files loaded by `loadEnv()` (`server.js:52-73`); Python `client.py` reads the repo-root `.env`.
- Hardcoding checks: no tokens hardcoded in source. However, a real `.env` **is present in the working tree** with `TOKEN_CAJA_NEGRA`, `TOKEN_API_ENTRYPOINT`, `URL_API_ENTRYPOINT` values. It is gitignored and not tracked (`git ls-files` confirms absence), but it is a live secret exposure risk.
- Template files: `reemplazo/.env.example` (PORT, TOKEN_API_ENTRYPOINT with placeholder), `reto2-investigacion/.env.example` (URL, both tokens with placeholders).
- Rotation/lifecycle: unknown/not documented.

### 4) Reliability and Failure Behavior

- Retry/backoff: Python research client retries timeouts/429 up to 4 times with increasing sleep (`scripts/client.py:47-63`). The Node runtime performs no retries.
- Timeout policy: Python `requests` timeouts (8–20s); HTTP test uses `AbortSignal.timeout(5000)` (`test/http.test.js:22`). Evaluation limit is 5s per step.
- Transaction handling: Postgres `mutate` opens `BEGIN`, locks row, upserts, `COMMIT`; rolls back on error (`storage.js:64-88`).
- Fallback/circuit breaker: none.
- Readiness: Vercel composition lazily creates the table once via `storage.ensure()` (`api/index.js:23-31`); `/health` does not check DB readiness.

### 5) Observability for Integrations

- Logging around external calls: only `console.error` on handler failure; no DB call logging.
- Metrics/tracing: none.
- Missing visibility gaps: no connection-pool metrics, no slow-query logging, no alerting, no request IDs.

### 6) Evidence

- `api/index.js`, `reemplazo/src/storage.js`
- `reemplazo/.env.example`, `reto2-investigacion/.env.example`, `.gitignore`
- `vercel.json`, `.vercel/project.json`
- `reto2-investigacion/scripts/client.py`

## Extended Sections (Optional)

### Endpoint catalog

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| GET | `/health` | Bearer | `200 {"ok":true}` |
| POST | `/__reset` | Bearer | `200 {"ok":true}`, resets domain state and counters (not `x-req`) |
| POST | `/msg` | Bearer | Protocol message; `{"m":"..."}` |
| any other | `*` | Bearer | `404 {"error":"E404","mensaje":"ruta desconocida"}` |

Sources: `reemplazo/src/server.js:106-116`, `reto2-investigacion/SPEC.md` §1.

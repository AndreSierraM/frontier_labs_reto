# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: **layered / minimal hexagonal seam** (HTTP adapter → pure domain core → state seam).
- Why this classification: `reemplazo/src/server.js` handles only transport concerns and delegates all behavior to `reemplazo/src/domain.js`; state persistence is isolated behind `storage.js`. `docs/01-diseno.md` explicitly names it "arquitectura hexagonal mínima".
- Primary constraints:
  1. Exact wire compatibility is required (status + body compared byte/semantics-wise), so transport framing lives in the adapter, not the core.
  2. State must be resettable as a unit; the seam exposes `mutate(fn)` and `reset()`, not per-table CRUD.
  3. Single logical writer: local runtime is in-memory; the Vercel variant uses a single-row Postgres state with `SELECT ... FOR UPDATE`.

### 2) System Flow

```text
Client/evaluator -> Bearer auth -> route match -> body read (limit 8191) -> JSON parse
  -> storage.mutate(state) -> domain.processMessage(state, m) -> mutate state + response
  -> storage persists -> HTTP status/body + x-req header
```

Steps (evidence-backed):
1. `createHandler(storage)` validates `Authorization: Bearer <TEAM_TOKEN>` before any route (`server.js:99-104`).
2. Routes: `GET /health`, `POST /__reset`, `POST /msg`; anything else → `E404` (`server.js:106-116`).
3. `handleMsg` reads a bounded body, parses JSON, requires `m` string (`server.js:75-95`).
4. `storage.mutate` invokes the pure `processMessage` and returns `{r, xreq}` (`server.js:97-100`, `storage.js:52-58`).
5. `domain.processMessage` applies parsing, control validation, guards and state transitions (`domain.js:102-196`).
6. The adapter maps `r.code` to its catalog status/body or emits `r.ok`; `x-req` is echoed (`server.js:102-110`).

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| HTTP adapter `server.js` | auth, routing, body limit, JSON, error framing, `x-req`, local server bootstrap | balance/state rules, ID formatting | `server.js` |
| Domain core `domain.js` | control ISO 7064, parser, guards, state transitions, error catalog | HTTP, sockets, DB | `domain.js` |
| Storage seam `storage.js` | serializing state, transactional `mutate`, `reset`, memory/Postgres adapters | business rules | `storage.js` |
| Vercel composition `api/index.js` | pool, storage wiring, idempotent table creation | duplicated rules | `api/index.js` |
| Research scripts | probing/validation against original and replacement | deployed runtime behavior | `reto2-investigacion/scripts/` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Ports-and-adapters seam | `storage.js` (`createMemoryStorage`, `createPostgresStorage`) | Same domain runs locally/in tests and against Neon without touching rules |
| Pure state machine (`δ(S,event)`) | `domain.js` `processMessage`, `freshState` | Deterministic, testable without network |
| Serialize/restore via `Map` ↔ JSON | `storage.js` `toJSON`/`fromJSON` | Enables any persistence backend |
| Catalog table for errors | `domain.js` `ERRORES` | Single source of exact status/body pairs |
| Transactional single-writer state | `storage.js:61-92` | Avoids torn writes across concurrent requests |

### 5) Known Architectural Risks

- **Design-vs-implementation divergence:** `docs/01-diseno.md`/`02-arquitectura.md` specify SQLite, three tables and Node 24; the actual persistence is a single JSONB row in Postgres (Vercel) or memory (local). The docs describe intended future work, not current runtime.
- **Single-row Postgres contention:** every mutation locks the one `estado` row (`FOR UPDATE`), serializing all requests; `pool.max: 3` (`api/index.js:18`).
- **Serverless vs single-instance intent:** Vercel may run multiple function instances; shared Postgres mitigates state split but contradicts the "una sola instancia" design assumption.
- **`x-req` semantics:** the adapter emits `x-req` but the evaluation ignores headers; `__reset` does not reset it (documented in `SPEC.md` M-04).

### 6) Evidence

- `reemplazo/src/server.js`, `reemplazo/src/domain.js`, `reemplazo/src/storage.js`
- `api/index.js`
- `docs/01-diseno.md`, `docs/02-arquitectura.md`
- `reto2-investigacion/SPEC.md`

## Extended Sections (Optional)

### State model (as implemented)

- `S = { cuentas: Map<id,{saldo,fallos,nombre}>, operaciones: Map<id,{tipo,origen,destino,monto,anulada}>, nextCuenta, nextOperacion }` (`domain.js:70-78`).
- Account blocking is **derived**: `fallos >= 3` (`domain.js:180`); no duplicate boolean flag.
- `E506`/`E507` increment `fallos` even though they return 422 — errors are not always no-ops (`domain.js:168-174`).
- `ANULA` reverses balances and marks `anulada`; second call returns `{ok:false}` (`domain.js:186-196`).

### Startup / initialization order

- Local: `server.js` calls `loadEnv()` at module load, builds a memory storage, creates the server, and listens only under `require.main === module`.
- Vercel: `api/index.js` creates the `pg.Pool` at module load and lazily runs `storage.ensure()` once before the first request.

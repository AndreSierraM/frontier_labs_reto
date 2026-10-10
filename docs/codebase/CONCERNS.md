# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| high | A real `.env` with live tokens/URL sits in the working tree (`TOKEN_CAJA_NEGRA`, `TOKEN_API_ENTRYPOINT`). It is gitignored and untracked, but present on disk. | `.env`, `.gitignore`, `git ls-files` (no `.env`) | Credential leak if the working dir is shared, synced, or accidentally committed with `git add -f` | Rotate tokens if ever exposed; keep `.env` out of any archive; consider pre-commit secret scanning |
| high | Design docs specify SQLite + three tables + Node 24 + one instance, but the deployed Vercel path uses single-row JSONB in Postgres and no SQLite. | `docs/01-diseno.md`, `docs/02-arquitectura.md`, `api/index.js`, `reemplazo/src/storage.js` | Reviewers/authors may believe SQLite exists; divergence between documented and actual behavior | Update design docs to label SQLite as future work, or implement it; document the Postgres decision |
| med | `vercel.json` rewrites **all** paths to `/api/index`, so present/future static files only win by filesystem precedence. | `vercel.json`, commit `db1f11b` | Accidental API dispatch for missing static assets; hard-to-debug routing | Keep explicit static route handling or narrow the rewrite pattern |
| med | Postgres state is one row serialized with `FOR UPDATE`; pool `max: 3`. | `reemplazo/src/storage.js:63-97`, `api/index.js:18` | All mutations serialize; hot-path contention under load | Partition state per token/bucket or use row-level granularity if concurrency matters |
| med | Duplicate deliverable HTML/PDF exist under both `docs/entregables/` and `public/entregables/` with **different checksums**; two `index.html` also differ. | `shasum` of `docs/` vs `public/` files | Content drift; unclear which copy is canonical | Make `public/` a build copy of `docs/` or delete the duplicate |
| low | Legacy research scripts import an external `/tmp/api` module and fail from a clean checkout. | `reto2-investigacion/scripts/README.md`, scan | Broken tooling; confusion during reproduction | Move them clearly under `historico/` or delete |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| No CI pipeline | Event time pressure | scan: "No CI/CD pipelines detected" | Regressions ship unnoticed | Add CI running `npm --prefix reemplazo test` |
| No linter/formatter config | Time pressure; single author | scan: no ESLint/Prettier | Style drift, latent bugs | Add ESLint + Prettier (or Biome) |
| No coverage threshold | Not required by challenge | `TESTING.md` | Unknown untested paths | Add `c8`/coverage gate |
| Root `pg` dependency coupled to Vercel only | Added for serverless persistence | `package.json`, `api/index.js` | `reemplazo/` image stays clean, but root install is not the runtime | Document that root install is Vercel-only |
| Design docs out of sync with implementation | Docs written as target design | `docs/01-diseno.md`, `docs/02-arquitectura.md` | Misleading onboarding | Reconcile or mark as roadmap |
| Archived map could be mistaken for current docs | Kept as history | `docs/archivo/README.md` | Readers trust stale claims | Already disclaimed; keep disclaimer prominent |

### 3) Security Concerns

| Risk | OWASP category (if applicable) | Evidence | Current mitigation | Gap |
|------|--------------------------------|----------|--------------------|-----|
| Plaintext research tokens on disk | A02 Cryptographic Failures / A05 Misconfiguration | `.env` | `.gitignore`, not tracked | No secret manager; no rotation policy; present on disk |
| Forgeable message control (ISO 7064 over limited alphabet) | A02 / A04 Insecure Design | `reemplazo/src/domain.js:31-49`, `SPEC.md` R-02 | None | Cryptographic signature (HMAC/TOTP) recommended in spec |
| Predictable sequential IDs (`AC-%04d`, `OP-%04d`) | A01 Broken Access Control / A04 | `domain.js:80-90`, `SPEC.md` R-05 | None | UUIDs/sequence per token |
| `ANULA` reverses balances without audit | A09 Logging/Monitoring Failures | `domain.js:186-196`, `SPEC.md` R-03 | None | Append-only ledger |
| DB TLS validation disabled | A05 Misconfiguration | `api/index.js:20` `ssl:{rejectUnauthorized:false}` | Encrypted transport, cert unverified | Verify CA if provider allows |
| Bearer token comparison not constant-time | A02 | `server.js:100` string `!==` | None | Low practical risk; use `crypto.timingSafeEqual` if desired |

Note: `.env` is **not** tracked by git (`git ls-files` empty for it), so no secret has been committed in the current history.

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Whole-state JSONB read/write per request | `storage.js:63-97` | None at low volume | O(state) write cost grows with accounts/operations | Normalize to per-account rows or event log |
| Single-row lock serializes mutations | `storage.js:66` `FOR UPDATE` | None at low volume | Throughput capped at one writer | Row/shard-level locking |
| Serverless cold start + lazy table creation | `api/index.js:23-31` | Possible first-request latency | Timeout risk under 5s step budget | Pre-migrate schema out of band |
| In-memory state loses data on restart | `storage.js:41-59`, `reemplazo/README.md` | Local only | Not production-durable | Already addressed via Postgres for Vercel |
| `x-req` never reset | `storage.js:47-58`, `SPEC.md` M-04 | Monotonic counter | Information leak about activity | Per-token counter |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `vercel.json` | Rewrite semantics affect all routing | 3 commits in 90 days (top churn) | Test static + API paths after every change |
| `api/index.js` | Newest integration; couples handler + DB | 2 commits | Exercise against a real Postgres before deploy |
| `reemplazo/src/server.js` | Shared by local and serverless; auth/route framing | 2 commits | Run `npm test` plus a live `/health` smoke |
| `docs/entregables/*.html` + PDFs | Generated artifacts; hand-edited | 2 commits | Regenerate from source HTML; check one-page output |
| `reemplazo/src/storage.js` | Persistence correctness under errors | 1 commit, recent | Keep `mutate`/`reset` contract tests |

### 6) `[ASK USER]` Questions

1. `[ASK USER]` Is `docs/01-diseno.md`/`02-arquitectura.md` meant to describe the **final submitted architecture** (which should then be re-synced to the Postgres implementation), or a **target design** that the Vercel/Postgres path deliberately replaces?
2. `[ASK USER]` Should the committed `public/` deliverables be treated as canonical, or is `docs/entregables/` canonical? How should the checksum drift between them be resolved?
3. `[ASK USER]` Is the challenge still active / will the original service once again be contacted, or is `reto2-investigacion` now frozen evidence (affecting whether legacy `/tmp/api` scripts should be removed)?
4. `[ASK USER]` What is the intended deployment topology — a single long-lived instance (as `reemplazo/README.md` says) or Vercel serverless with Postgres (as `api/index.js` implements)?
5. `[ASK USER]` Should root `.env` and any local secrets be rotated/removed now that documentation work is underway?

### 7) Evidence

- `docs/codebase/.codebase-scan.txt` (high-churn files, no CI/security perf configs)
- `reemplazo/src/server.js`, `reemplazo/src/storage.js`, `api/index.js`, `vercel.json`
- `.env`, `.gitignore`, `git ls-files`
- `docs/01-diseno.md`, `docs/02-arquitectura.md`, `reto2-investigacion/SPEC.md` §7
- `reto2-investigacion/README.md` §6

## Extended Sections (Optional)

### Intent vs. Reality divergences (from Phase 1)

| Stated intent | Actual state | Evidence |
|---------------|--------------|----------|
| SQLite on a local persistent volume, three tables (`cuentas`/`operaciones`/`contadores`) | Single-row JSONB `estado` table in Postgres (Vercel) or in-memory Maps (local) | `docs/01-diseno.md`, `storage.js`, `api/index.js` |
| Node 24 target | Declared `>=18`; Docker `node:20-alpine` | `reemplazo/Dockerfile`, `package.json` |
| Single instance, one writer | Vercel serverless may scale horizontally; shared Postgres introduced | `reemplazo/README.md`, `api/index.js` |
| `docs/archivo/mapa-inicial/` describes the repo | It predates the implementation and explicitly says so | `docs/archivo/README.md`, `mapa-inicial/STACK.md` ("[TODO] No hay implementación") |
| `public/` and `docs/` deliver the same files | Checksums differ | `shasum` output |

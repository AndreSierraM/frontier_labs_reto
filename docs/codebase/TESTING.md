# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: Node built-in test runner `node:test` (HTTP) plus a hand-rolled `assert` harness (domain). Python scripts provide end-to-end validation.
- Assertion/mocking tools: `assert`, `node:assert/strict`; no mocking library.
- Commands:

```bash
# Unit + HTTP smoke (runs domain.test.js then node --test http.test.js)
npm --prefix reemplazo test

# End-to-end: 20 official examples + 34 control pairs + 62 battery steps
.venv/bin/python reto2-investigacion/scripts/validar.py --url http://localhost:3111 --token local-test

# Replay one JSONL sequence and compare status/body
.venv/bin/python reto2-investigacion/scripts/verificar.py --url http://localhost:3111 --token local-test \
  --file frontier-reto-2/pruebas/ejemplos.jsonl

# Differential original vs replacement (requires original access)
python3 reto2-investigacion/scripts/prueba_diferencial.py

# Coverage: not configured
```

- Reported results (`reto2-investigacion/logs/validacion.json`): examples 20/20, control 34/34, battery 62/62, total **116/116**. Verified `npm test` output: **21 domain tests OK**, **1 HTTP test pass** (run 2026-10-10).

### 2) Test Layout

- Test file placement: co-located under `reemplazo/test/`; Python validators in `reto2-investigacion/scripts/`.
- Naming convention: `*.test.js` for Node tests; `validar.py`/`verificar.py` for Python suites.
- Setup files: none. `test/http.test.js` sets `process.env.TOKEN_API_ENTRYPOINT` before requiring the server and binds `server.listen(0)`; domain tests build fresh state via `d.freshState()`.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | yes | Pure domain: control, parsing, guards, ANULA, E510 | 21 tests, no network (`domain.test.js`) |
| Integration | yes | HTTP contract: auth variants, routes, body errors, reset | One `node:test` case with ephemeral port (`http.test.js`) |
| E2E / protocol conformance | yes (local) | Official 20 examples + extended battery | `verificar.py`, `validar.py` |
| Differential vs original | partial | Original vs replacement | `prueba_diferencial.py`; reported 75/78, 3 explained by retry duplication |
| Surveillance/regression | yes | Detect original service changes over time | `vigilancia.py` snapshots in `logs/snapshots/` |

### 4) Mocking and Isolation Strategy

- Main approach: no mocks. Domain tests call the pure function directly; HTTP tests run a real `http.Server` on an ephemeral port; Python suites call a live service.
- Isolation: each domain test creates its own `freshState()`; the HTTP/session tests call `POST /__reset` at the start; battery resets before each labeled sequence.
- Common failure mode: replacing in-memory storage with Postgres changes concurrency behavior; retrying a timed-out mutation can duplicate state against the original (documented in `README.md` and `scripts/README.md`).

### 5) Coverage and Quality Signals

- Coverage tool + threshold: none.
- Current reported coverage: not measured.
- Known gaps/flaky areas:
  - Hidden evaluator set (100 tests) cannot be run locally.
  - SQLite/Node 24 target from design docs is unimplemented (`README.md`).
  - Differential 75/78 has 3 non-lógica discrepancies caused by retries.
  - Open assumptions: destination fallos reset on success, suggestion tie-break, unreached error codes (`reto2-investigacion/README.md` §6).
- Tests contain no production TODO/FIXME markers (scan found only one unrelated print in `probe_recon.py`).

### 6) Evidence

- `reemplazo/package.json` (test script)
- `reemplazo/test/domain.test.js`, `reemplazo/test/http.test.js`
- `reto2-investigacion/scripts/validar.py`, `verificar.py`, `vigilancia.py`
- `reto2-investigacion/logs/validacion.json`
- Terminal output of `npm --prefix reemplazo test` (21 + 1 passing)

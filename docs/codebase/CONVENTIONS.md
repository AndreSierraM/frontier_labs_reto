# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files (JS runtime) | lowercase, dotted by role | `domain.js`, `storage.js`, `domain.test.js` | `reemplazo/src/`, `reemplazo/test/` |
| Files (Python) | lowercase `snake_case` | `validar.py`, `bloqueo_precedencia.py` | `reto2-investigacion/scripts/` |
| Functions/methods | `camelCase` (JS), `snake_case` (Python) | `processMessage`, `createPostgresStorage` / `send_and_log`, `control` | `reemplazo/src/domain.js`, `scripts/client.py` |
| Types/interfaces | No TypeScript; plain objects/JSDoc types | `{ code: string, sugerencia?: string }` | `reemplazo/src/domain.js:99` |
| Constants | `UPPER_SNAKE_CASE` | `ERRORES`, `MAX_BODY`, `COMANDOS`, `_MENSAJES` | `domain.js:10`, `server.js:47`, `domain.js:43`, `validar.py:29` |
| Env vars | `UPPER_SNAKE_CASE` | `TOKEN_API_ENTRYPOINT`, `DATABASE_URL` | `reemplazo/.env.example`, `api/index.js` |
| Comments/docs | Spanish, JSDoc block at file top | File headers in `server.js`, `storage.js` | `reemplazo/src/*.js` |

### 2) Formatting and Linting

- Formatter: **none configured** (no Prettier/editorconfig).
- Linter: **none configured** (no ESLint config, no Python linter config).
- Observed style (de facto): 2-space indentation, double quotes, semicolons, `"use strict";` at top of every JS module, trailing commas in multiline literals.
- Run commands: none for lint/format; validation is done through tests.

### 3) Import and Module Conventions

- Import grouping: Node built-ins first, then local modules (`server.js:25-29`).
- Alias vs relative: relative `require` only; no path aliases.
- Public exports: each module ends with an explicit `module.exports = { ... }` object; no barrel files. Python scripts use `if __name__ == "__main__":`.
- Module pattern: dependency injection via factory arguments (`createHandler(storage)`, `createPostgresStorage(pool)`); no DI framework.

### 4) Error and Logging Conventions

- Domain errors: returned as `{ code }` references into the `ERRORES` catalog, never thrown for protocol errors (`domain.js:99-196`).
- HTTP errors: mapped centrally in `send()` / `handleMsg()` (`server.js:55-58`, `102-110`).
- Uncaught adapter errors: logged with `console.error("handler error:", err)` and returned as `500 {"error":"E500",...}` only if headers not yet sent (`server.js:117-122`).
- Logging: no structured logger; `console.log` for startup, `console.error` for failures. Python scripts print human-readable summaries.
- Redaction: no logging of tokens; `.env` is gitignored and `.gitignore` excludes raw capture logs (`reto2-investigacion/logs/*.jsonl`).

### 5) Testing Conventions

- Test file naming/location: `reemplazo/test/*.test.js`; Python validators live in `reto2-investigacion/scripts/`.
- Mocking strategy: none — pure domain tests run in-process; HTTP test binds an ephemeral port; Python suites hit a running service via HTTP.
- Coverage expectation: none enforced (no coverage tooling). Reported results are pass counts in `reto2-investigacion/logs/validacion.json`.

### 6) Evidence

- `reemplazo/src/server.js`, `reemplazo/src/domain.js`, `reemplazo/src/storage.js`
- `reemplazo/test/domain.test.js`, `reemplazo/test/http.test.js`
- `docs/codebase/.codebase-scan.txt` (no lint/format config)
- `reto2-investigacion/scripts/client.py`, `validar.py`

## Extended Sections (Optional)

### Intentional contract quirks preserved as conventions

- The typo `"recieved"` in success bodies is intentional and must be preserved (`domain.js:131`, `SPEC.md` K-D1).
- `E301` message has a trailing space: `"comando desconocido "` (`domain.js:20`, `SPEC.md` K-U1).
- Spanish identifiers and error messages are part of the external contract; do not translate them.
- `ANULA` naming: the public field is `anulada`, the state flag is `anulada`, and the operation field uses `anulada: false` (`domain.js:131-196`).

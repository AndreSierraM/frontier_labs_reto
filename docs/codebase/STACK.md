# Technology Stack

> Scope: The repository contains one deployable Node.js runtime (`reemplazo/` + `api/`), a Python research toolchain (`reto2-investigacion/`), and static documentation (`docs/`, `public/`). There is no monorepo workspace config; the root `package.json` exists only to provide `pg` for the Vercel function.

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language (runtime) | JavaScript, CommonJS (`"use strict"`) | `reemplazo/src/*.js`, `api/index.js` |
| Primary language (tooling) | Python 3 | `reto2-investigacion/scripts/*.py`, `requirements.txt` |
| Runtime + version | Node.js `>=18` (declared); Docker image pins `node:20-alpine` | `package.json`, `reemplazo/package.json`, `reemplazo/Dockerfile` |
| Package manager | npm (Node); pip via `requirements.txt` (Python) | `package-lock.json`, `reto2-investigacion/requirements.txt` |
| Module/build system | CommonJS `require` (no bundler/transpiler); Python scripts run directly | `reemplazo/src/server.js:26`, `reto2-investigacion/scripts/validar.py` |

Note: `README.md` and `docs/01-diseno.md` describe a **future** Node 24 / SQLite target; that is design intent, not the installed runtime (`README.md` "Estado y límites").

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `pg` | `^8.11.5` (locked 8.23.1) | PostgreSQL client used only by the Vercel serverless entrypoint to persist state | `package.json`, `api/index.js:17`, `package-lock.json` |
| Node `http` (stdlib) | Node built-in | HTTP adapter and local server | `reemplazo/src/server.js:25` |
| Node `fs`, `path` (stdlib) | Node built-in | `.env` file loading | `reemplazo/src/server.js:26-27` |
| `requests` | `>=2.32,<3` | Python HTTP client for research/validation scripts (not part of the deployed runtime) | `reto2-investigacion/requirements.txt` |

`reemplazo/package.json` declares **no** production or dev dependencies — the delivered executable is stdlib-only.

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| Node built-in test runner (`node:test`) | HTTP smoke test | `reemplazo/package.json` `test` script, `reemplazo/test/http.test.js:4` |
| Custom `assert`-based harness | 21 pure-domain unit tests | `reemplazo/test/domain.test.js:8-14` |
| Node `assert` / `node:assert/strict` | Assertions | `reemplazo/test/domain.test.js`, `reemplazo/test/http.test.js` |
| Python `requests` + plain scripts | End-to-end replay, control battery, differential, surveillance | `reto2-investigacion/scripts/validar.py`, `verificar.py` |
| Playwright (documentation only) | Regenerate deliverable PDFs from HTML | `docs/README.md` (snippet) |
| Linter / formatter | **None configured** | scan output "No linting or formatting config files found"; no ESLint/Prettier/editorconfig in tree |
| CI/CD | **None configured** | scan output "No CI/CD pipelines detected" |

### 4) Key Commands

```bash
# Install (root — only needed for the Vercel function)
npm install

# Run the delivered replacement locally
TOKEN_API_ENTRYPOINT=local-test PORT=3111 npm --prefix reemplazo start

# Tests (from repo root)
npm --prefix reemplazo test

# Python research deps (venv recommended)
python3 -m venv .venv && .venv/bin/python -m pip install -r reto2-investigacion/requirements.txt

# End-to-end validation against a running replacement
.venv/bin/python reto2-investigacion/scripts/validar.py --url http://localhost:3111 --token local-test

# Docker image (build with reemplazo/ as context)
docker build -t caja-negra-reemplazo reemplazo
```

### 5) Environment and Config

- Config sources: `.env` (root, gitignored), `reemplazo/.env` (optional), `ENV_FILE` path, process env. Loader precedence documented in `reemplazo/src/server.js:52-73` and `reemplazo/README.md`.
- Required env vars:
  - `TOKEN_API_ENTRYPOINT` (alias `TEAM_TOKEN`) — bearer token for the replacement; empty means all calls return `E001`.
  - `PORT` — HTTP port (default `3000`).
  - `ENV_FILE` — optional path to an env file.
  - `DATABASE_URL` — pooled Neon/Postgres connection string (Vercel function only).
  - Research-only: `URL_API_ENTRYPOINT`, `TOKEN_CAJA_NEGRA` (`reto2-investigacion/.env.example`).
- Deployment/runtime constraints:
  - `vercel.json` rewrites all paths to `/api/index`; static files in `public/` win by filesystem (commit `db1f11b`).
  - The replacement is intended as a single writer/single instance; `reemplazo/README.md` warns that multiple instances do not share in-memory state.

### 6) Evidence

- `package.json`, `package-lock.json`
- `reemplazo/package.json`, `reemplazo/Dockerfile`
- `reto2-investigacion/requirements.txt`
- `api/index.js`, `vercel.json`
- `docs/codebase/.codebase-scan.txt` (STACK DETECTION, CI/CD, LINTING sections)
- `docs/archivo/mapa-inicial/STACK.md` (historical — records pre-implementation state; not current)

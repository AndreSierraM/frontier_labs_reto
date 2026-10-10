# Anti-slop upstream record

Provenance record for the vendored anti-slop Oxlint plugin in this repository.
This installation was created by the `install-anti-slop` skill (fresh install, no prior copy).

## Source identity

| Field | Value |
| --- | --- |
| Source | Bundled plugin shipped with the `install-anti-slop` agent skill |
| Source repository | **unknown** — the skill bundle ships no repository URL or remote |
| Source revision (commit) | **unknown** — no commit or tag metadata is present in the bundle |
| Recoverable pristine snapshot | `/Users/as/.agents/skills/install-anti-slop/assets/anti-slop` (bundle mtime `2026-09-08T14:36:26`) |
| Snapshot content digest | `sha1:84ec6fc6b5085c96380fc03cd9ae0d22f7286700` (normalized: sorted relative path + file sha1, then sha1) |
| Vendored content digest | `sha1:84ec6fc6b5085c96380fc03cd9ae0d22f7286700` (identical to the snapshot above) |
| Files vendored | 26 |

Because the source repository and commit are unknown, the normalized content digest above is the
identifier for the exact bytes installed. A future update should diff against that digest rather
than assuming a commit.

## Installed paths

| Path | Role | Registered? |
| --- | --- | --- |
| `tools/oxlint/anti-slop/index.ts` | Generic anti-slop plugin (`anti-slop`) | yes (`jsPlugins` in `.oxlintrc.json`) |
| `tools/oxlint/anti-slop/rules/*.ts` | Generic rule implementations | via entry point |
| `tools/oxlint/anti-slop/shared/*.ts` | Shared rule helpers | via rule imports |
| `tools/oxlint/anti-slop/effect/index.ts` | Opt-in Effect rules (`anti-slop-effect`) | **no** — eliminado del repo el 2026-10-10 (nunca estuvo registrado) |

## Intentional deviations from the bundle

- The Effect plugin (`tools/oxlint/anti-slop/effect/`) was vendored but **never
  registered** (this repository has no direct `effect` dependency), and was
  removed from the repo on 2026-10-10 to keep the tree lean. This
  repository has no direct `effect` dependency (root `package.json` declares only `pg`), and the
  Effect rules were not explicitly requested.
- No rules were renamed, added, removed, or re-scoped relative to the bundle.

## Dependencies

| Package | Version | Type |
| --- | --- | --- |
| `oxlint` | `1.87.0` (exact) | devDependency |
| `@oxlint/plugins` | `1.87.0` (exact) | devDependency |

Both packages were installed at the same current version (queried via `npm view`). No pre-existing
`oxlint` dependency existed. Unrelated dependency ranges were preserved (`pg: ^8.11.5` unchanged).
The Effect plugin was intentionally not enabled despite `effect` being absent.

## Configuration changes

- Added `.oxlintrc.json` with:
  - `ignorePatterns`: agent tooling dirs (`.agent`, `.agents`, `.claude`, `.codex`, `.continue`,
    `.cursor`, `.gemini`, `.opencode`, `.pi`, `.roo`, `.windsurf`), the generated `.vercel/**`
    link dir, and the vendored plugin itself (`tools/oxlint/anti-slop/**`).
  - `jsPlugins`: `{ "name": "anti-slop", "specifier": "./tools/oxlint/anti-slop/index.ts" }`.
  - All 18 generic rules plus native `oxc/no-accumulating-spread` set to `"error"`.
- Added `"lint": "oxlint ."` to the root `package.json` scripts (there was no lint command before).

## Verification results

- `npm run lint` executes and loads the vendored plugin successfully (rules fire).
- Findings in owned source (reported, **not** auto-fixed — no migration/cleanup was requested):
  - `reemplazo/src/server.js:111:19` — `anti-slop(no-runtime-typeof)`
  - `reemplazo/src/server.js:111:50` — `anti-slop(no-runtime-typeof)`
  - Pre-existing native warnings (not anti-slop): `reemplazo/src/domain.js:55`
    (`unicorn/no-new-array`), `reemplazo/src/server.js:42` and `:108` (`no-unused-vars`).
- Known limitation: Node emits `MODULE_TYPELESS_PACKAGE_JSON` while loading the ESM `.ts` plugin
  because `package.json` has no `"type"`. Adding `"type": "module"` would break this repository's
  CommonJS `.js` runtime (`require`), so it was deliberately not added. The warning is benign.

## Next-update instructions

1. Stage the new bundle with the installer into a temporary path; do not overwrite the live copy.
2. Diff incoming content against the vendored tree using the normalized digest method above.
3. Treat this file and `.oxlintrc.json` as owned policy: preserve local ignores, rule set, and the
   Effect opt-in decision unless the user explicitly changes them.

# Sistema de agentes · Reto 2 "La caja negra"

Vigilancia y adaptación autónoma del reemplazo. Tres piezas, cada una donde
corresponde:

| Pieza | Dónde corre | Rol |
| --- | --- | --- |
| API + endpoints de monitor | **Vercel** (`frontier-labs-reto.vercel.app`) | Atiende el contrato (`/health`, `/msg`, `/__reset`) y sirve `/api/monitor/*` |
| Estado y eventos | **Neon** (Postgres) | Estado del reemplazo, snapshots y eventos del monitor |
| Reloj (cron) | **GitHub Actions** `monitor.yml` | Cada 15 min llama al monitor (Vercel Hobby limita a 1 cron/día) |
| Enjambre de agentes | **GitHub Actions** `swarm.yml` | Solo ante un cambio detectado: investiga, parchea y abre PR |

```
monitor.yml (cada 15 min)
  └─ Vercel /api/monitor/run
        └─ batería vs API oficial → snapshot en Neon → eventos original_changed
              └─ repository_dispatch: original-changed
                    └─ swarm.yml
                         1. scouts × N   (paralelo)   exploran el original
                         2. analista                  diagnóstico accionable
                         3. fixer                     parche + tests
                         4. verificador (código)      local vs original → 0 divergencias
                         5. reporter                  cuerpo del PR
                         → PR (no toca main; merge → deploy Vercel)
```

## Por qué GitHub Actions para el enjambre

Vercel Functions son serverless, efímeras y sin filesystem ni git; un agente que
edita archivos, corre tests y abre un PR necesita una máquina real. GitHub
Actions es gratis para repos públicos, arranca por evento y no hay que mantenerlo.

## Roles

| Rol | Archivo | Hace | No hace |
| --- | --- | --- | --- |
| scout | `agent/roles/scout.md` | Explora una etiqueta contra el original | No edita código |
| analyst | `agent/roles/analyst.md` | Diagnóstico y plan de parche | No edita código |
| fixer | `agent/roles/fixer.md` | Parche + test + SPEC | No toca `.env`/monitor/agent |
| reporter | `agent/roles/reporter.md` | Cuerpo del PR | — |

El **gate** no es un LLM: `agent/lib/verify.mjs` arranca el reemplazo local, corre
la batería de 31 puntos contra el original y exige **0 divergencias**. Si el fixer
alucina, la verificación lo rechaza.

## Cómo se ejecuta

- **Automático**: `monitor.yml` detecta el cambio y dispara `swarm.yml`.
- **Manual (nube)**: `gh workflow run swarm.yml --repo AndreSierraM/frontier_labs_reto`
- **Local (pruebas)**:
  ```bash
  export URL_API_ENTRYPOINT=... TOKEN_CAJA_NEGRA=...
  export SWARM_CHANGES_FILE=/ruta/changes.json   # opcional: evita tocar el monitor
  node agent/swarm.mjs [--dry-run]
  ```

## Configuración

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | GitHub Secret | Credencial del modelo |
| `MONITOR_TOKEN` | GitHub Secret + Vercel | Autentica `/api/monitor/*` |
| `URL_API_ENTRYPOINT` / `TOKEN_CAJA_NEGRA` | GitHub Secret + `.env` | Original a estudiar |
| `SWARM_PROVIDER` / `SWARM_MODEL` | Opcional | Default: `openrouter` / `deepseek/deepseek-v4.1-flash` |
| `MAX_SCOUTS` (4) / `MAX_FIX_ROUNDS` (2) | Opcional | Límite de costo/reintentos |

## Artefactos

Cada corrida escribe `agent/state/<UTC>/` (`changes.json`, `scout-*.md`,
`diagnosis.md`, `fixer-*.md`, `verification-*.json`, `pr-body.md`) y se sube como
artefacto del workflow (`swarm-artifacts`, 7 días).

## Límites

- El enjambre **abre PR, no mergea**: mergear dispara deploy en Vercel.
- Si no logra verificación verde, falla y **no** marca el evento (reintentable).
- Un cambio en el **algoritmo de control** es más difícil: el scout tendría que
  re-descifrarlo. El verificador lo detectará y el evento quedará pendiente.
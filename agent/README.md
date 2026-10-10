# Sistema de agentes · Reto 2 "La caja negra"

Vigilancia y adaptación autónoma del reemplazo. Cada pieza donde corresponde:

| Pieza | Dónde corre | Rol |
| --- | --- | --- |
| API + endpoints de monitor | **Vercel** (`frontier-labs-reto.vercel.app`) | Contrato (`/health`, `/msg`, `/__reset`) y `/api/monitor/*` |
| Estado y eventos | **Neon** (Postgres) | Estado del reemplazo, snapshots y eventos |
| Reloj | **GitHub Actions** `monitor.yml` | Cron cada 15 min o **bucle** (`loop_minutes`) |
| Enjambre | **GitHub Actions** `swarm.yml` | Solo ante cambio: investiga, parchea, verifica y abre PR |

```
monitor.yml (cron / bucle)
  └─ Vercel /api/monitor/run
        └─ batería (31 puntos) vs API oficial → snapshot en Neon → eventos
              └─ si cambió: workflow_call → swarm.yml  (mismo run)
                   1. logs de Vercel (errores de runtime)
                   2. scouts × N   (paralelo) investigan el original
                   3. analista               diagnóstico (PATCH: yes|no)
                   4. fixer                  parche + tests
                   5. verificador (código)   local vs original → 0 divergencias
                   6. reporter               cuerpo del PR
                   → PR (no toca main; merge → deploy en Vercel)
```

## Por qué GitHub Actions para el enjambre

Vercel Functions son serverless, efímeras y sin filesystem ni git; un agente que
edita archivos, corre tests y abre un PR necesita una máquina real. GitHub
Actions es gratis para repos públicos, arranca por evento y no hay que mantenerlo.

Se usa un **workflow reutilizable** (`workflow_call`) porque `GITHUB_TOKEN` no
puede disparar otro workflow (`repository_dispatch` desde un workflow se ignora).

## Roles

| Rol | Archivo | Hace | No hace |
| --- | --- | --- | --- |
| scout | `agent/roles/scout.md` | Explora una etiqueta contra el original | No edita código |
| analyst | `agent/roles/analyst.md` | Diagnóstico y `PATCH: yes\n` | No edita código |
| fixer | `agent/roles/fixer.md` | Parche + test + SPEC | No toca `.env`/monitor/agent |
| reporter | `agent/roles/reporter.md` | Cuerpo del PR | — |

Entradas del diagnóstico: informes de scouts + **logs de Vercel** (errores de
runtime de la API desplegada).

El **gate** no es un LLM: `agent/lib/verify.mjs` arranca el reemplazo local y lo
compara contra el original (usando el snapshot del monitor como referencia) y
exige **0 divergencias**. Si el fixer alucina, la verificación lo rechaza. El
`PATCH: no` evita parchear falsos positivos.

## Cómo se ejecuta

- **Automático**: el reloj detecta el cambio y llama al enjambre en el mismo run.
- **Bucle (demo day)**: `gh workflow run monitor.yml -f loop_minutes=360`
- **Manual (nube)**: `gh workflow run swarm.yml --repo AndreSierraM/frontier_labs_reto`
- **Local (pruebas)** (requiere `pi` y las claves en el entorno):
  ```bash
  export URL_API_ENTRYPOINT=... TOKEN_CAJA_NEGRA=...
  export SWARM_CHANGES_FILE=/ruta/changes.json   # evita tocar el monitor
  node agent/swarm.mjs [--dry-run]
  ```

## Configuración

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | GitHub Secret | Credencial del modelo |
| `MONITOR_TOKEN` / `CRON_SECRET` | GitHub Secret + Vercel | Autentica `/api/monitor/*` |
| `URL_API_ENTRYPOINT` / `TOKEN_CAJA_NEGRA` | GitHub Secret + Vercel | Original a estudiar |
| `VERCEL_TOKEN` | GitHub Secret | Leer logs de Vercel |
| `SWARM_PROVIDER` / `SWARM_MODEL` | Opcional | Default: `openrouter` / `deepseek/deepseek-v4.1-flash` |
| `MAX_SCOUTS` (2) / `MAX_FIX_ROUNDS` (2) | Opcional | Límite de costo/reintentos |
| `SWARM_AGENT_TIMEOUT_MS` (300000) | Opcional | Timeout por agente (evita colgar el job) |

## Artefactos

Cada corrida escribe `agent/state/<UTC>/` (`changes.json`, `vercel-errors.jsonl`,
`scout-*.md`, `diagnosis.md`, `fixer-*.md`, `verification-*.json`, `pr-body.md`)
y se sube como artefacto del workflow (`swarm-artifacts`, 7 días).

## Pruebas

- [`docs/lab-e2e/README.md`](../docs/lab-e2e/README.md): original falso con un
  cambio real → `PATCH: yes` → parche + verificación.
- [`docs/lab-e2e/cadena-automatica.md`](../docs/lab-e2e/cadena-automatica.md):
  monitor → enjambre → **PR automático**, con runs y PRs.

## Límites

- El enjambre **abre PR, no mergea**: mergear dispara deploy en Vercel.
- Si la verificación es **no concluyente** (429/infra), no parchea ni falla el
  workflow; el evento queda pendiente.
- Un cambio en el **algoritmo de control** es más difícil: el scout tendría que
  re-descifrarlo. El verificador lo detectará y el evento quedará pendiente.
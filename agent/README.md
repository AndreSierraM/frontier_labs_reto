# Sistema de agentes · Reto 2 "La caja negra"

Vigilancia y adaptación autónoma del reemplazo. Cada pieza donde corresponde:

| Pieza | Dónde corre | Rol |
| --- | --- | --- |
| API + endpoints de monitor | **Vercel** (`frontier-labs-reto.vercel.app`) | Contrato (`/health`, `/msg`, `/__reset`) y `/api/monitor/*` |
| Estado y eventos | **Neon** (Postgres) | Estado del reemplazo, snapshots y eventos |
| Reloj | **GitHub Actions** `monitor.yml` | Cron cada 10 min o **bucle** (`loop_minutes`) |
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
                   6. revisor                gate: si pide cambios, vuelve al fixer
                   7. reporter               cuerpo del PR
                   → PR (no toca main; merge → deploy en Vercel)
```

## Por qué GitHub Actions para el enjambre

Vercel Functions son serverless, efímeras y sin filesystem ni git; un agente que
edita archivos, corre tests y abre un PR necesita una máquina real. GitHub
Actions es gratis para repos públicos, arranca por evento y no hay que mantenerlo.

Se usa un **workflow reutilizable** (`workflow_call`) porque `GITHUB_TOKEN` no
puede disparar otro workflow (`repository_dispatch` desde un workflow se ignora).

## Estructura

```
agent/
  swarm.mjs           entrypoint: ejecuta el pipeline y traduce el estado a exit code
  pipeline.mjs        fases: scouts → analista → fixer → verificación → reporter
  recon.mjs           mapeo ampliado (GitHub Actions)
  roles/*.md          prompts de rol
  lib/
    config.mjs        entorno resuelto una vez
    monitorClient.mjs cambios pendientes + ack
    phase.mjs         ejecuta un agente y guarda su informe
    pi.mjs            wrapper headless de pi (modelo fijo + timeout)
    verify.mjs        verificación determinista (batería + mapa)
    logs.mjs          logs de Vercel
    tests.mjs         `npm test`
    roles.mjs         carga de prompts
    runstate.mjs      artefactos de la corrida
```

## Roles

| Rol | Archivo | Hace | No hace |
| --- | --- | --- | --- |
| scout | `agent/roles/scout.md` | Explora una etiqueta contra el original | No edita código |
| analyst | `agent/roles/analyst.md` | Diagnóstico y `PATCH: yes\n` | No edita código |
| fixer | `agent/roles/fixer.md` | Parche + test + SPEC | No toca `.env`/monitor/agent |
| reviewer | `agent/roles/reviewer.md` | Revisa el parche; `REVIEW: cambios` reintenta con el fixer | No edita código |
| reporter | `agent/roles/reporter.md` | Cuerpo del PR | — |

Entradas del diagnóstico: informes de scouts + **logs de Vercel** (errores de
runtime de la API desplegada).

El **gate** no es un LLM: `agent/lib/verify.mjs` arranca el reemplazo local y lo
compara contra el original (snapshot del monitor + mapa ampliado) y exige **0
divergencias**. Si el fixer alucina, la verificación lo rechaza. El `PATCH: no`
evita parchear falsos positivos.

**Auto-ensanche:** al adaptar un comando/ruta nuevo, el fixer añade una sonda de
regresión a `monitor/probes.js` (catálogo), así el mapa sigue vigilando lo nuevo.

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

- **Original falso** controlable en `api/lab` (`/api/lab`): se introduce un
  cambio real → `PATCH: yes` → parche + verificación.
- **Cadena automática**: el monitor detecta el cambio, `workflow_call` dispara el
  enjambre y se abre un **PR automático**. Evidencia en los runs de
  [GitHub Actions](https://github.com/AndreSierraM/frontier_labs_reto/actions).

## Límites

- El enjambre **abre PR, no mergea**: mergear dispara deploy en Vercel.
- Si la verificación es **no concluyente** (429/infra), no parchea ni falla el
  workflow; el evento queda pendiente.
- Un cambio en el **algoritmo de control** es más difícil: el scout tendría que
  re-descifrarlo. El verificador lo detectará y el evento quedará pendiente.
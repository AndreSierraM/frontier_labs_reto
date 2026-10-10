# Frontier Labs · Reto 2: La caja negra

Reemplazo HTTP compatible del servicio original, modelado como **máquina de
estados extendida** (mensajes, guardas y efectos sobre cuentas, saldos,
operaciones y bloqueos), más un **sistema de vigilancia y adaptación autónoma**
que detecta cuándo el original cambia y propone el parche.

## Sistema desplegado

| Pieza | Dónde corre | Qué es |
| --- | --- | --- |
| **API / entrypoint** | Vercel | `https://frontier-labs-reto.vercel.app` → `/health`, `/msg`, `/__reset` |
| **Monitor** | Vercel + Neon | Endpoints `/api/monitor/{run,status,ack}`, snapshots y eventos en Postgres |
| **Estado** | Neon (Postgres) | Estado del reemplazo y del laboratorio |
| **Reloj** | GitHub Actions `monitor.yml` | Cada 15 min, o en bucle (`loop_minutes`) para el demo day |
| **Enjambre de agentes** | GitHub Actions `swarm.yml` | Ante un cambio: investiga, parchea, verifica y abre PR |
| **Original falso (lab)** | Vercel `/api/lab` | Solo pruebas; permite cambiar `E506` en caliente |
| **Panel** | Vercel `/monitor` | Dashboard: estado del original + nuestro servicio |

```
monitor.yml (cron / bucle)
  └─ Vercel /api/monitor/run  → batería vs API oficial → snapshot en Neon → eventos
        └─ (si cambió) workflow_call: swarm.yml
              1. scouts × N  (paralelo) investigan el original
              2. analista               diagnóstico (PATCH: yes|no)
              3. fixer                  parche + tests
              4. verificador (código)   local vs original → 0 divergencias
              5. reporter               cuerpo del PR
              → PR (no toca main; merge → deploy en Vercel)
```

Detalle del enjambre: [`agent/README.md`](agent/README.md).
- **Fix post-evaluación** (2026-10-10): en `server.js` se corrige `readBody` para que
  `413 E101` devuelva el JSON en lugar de cerrar la conexión (afectaba tests de body grande).

## Estructura del repositorio

```text
frontier-reto-2/            Material oficial del reto, sin modificar
reto2-investigacion/        Investigación, SPEC, bitácora y evidencia
  scripts/                   Sondas, validación (validar.py, validar_spec.py) y diferencial
reemplazo/                  Runtime del reemplazo (dominio, HTTP, persistencia)
  src/domain.js              Máquina de estados pura
  src/server.js              Adapter HTTP (reutilizable por local y Vercel)
  src/storage.js             Estado: memoria o PostgreSQL
api/                        Funciones serverless de Vercel
  index.js                   Entrypoint del reemplazo
  monitor/                   run · status · ack
  lab/                       Original falso controlable (pruebas)
monitor/                    Batería de vigilancia y capa de Postgres del monitor
agent/                      Enjambre de agentes (roles, harness, orquestador)
tools/                      Generadores de entregables (build-entregas.py, render-entregas.py)
demo-video/                 Video demo (Remotion): escenas, guion (GUION_VOZ.md) y render
public/                     Sitio estático: entregas, panel de monitor y demo.mp4
docs/                       Observabilidad y evidencia
```

## Entrypoint (contrato)

Desplegado y accesible por internet. Todas las llamadas llevan
`Authorization: Bearer <token>`.

| Ruta | Respuesta |
| --- | --- |
| `GET /health` | `200 {"ok":true}` |
| `POST /__reset` | `200 {"ok":true}` (estado inicial) |
| `POST /msg` | protocolo de mensajes (`{"m":"..."}`) |
| Cualquier otra | `404 {"error":"E404","mensaje":"ruta desconocida"}` |
| Sin token / token inválido | `401 {"error":"E001","mensaje":"no autorizado"}` |

El token del equipo es `TOKEN_API_ENTRYPOINT`. Validación del contrato:
23/23 comprobaciones (health, auth, rutas inexistentes, secuencia completa y
`__reset`).

## Ejecutar y probar localmente

Requisitos: Node ≥18. Python 3 (`requests`) solo para los scripts de investigación.

```bash
# tests de dominio + HTTP (sin red)
npm --prefix reemplazo test

# arrancar el reemplazo en local (token ficticio)
TOKEN_API_ENTRYPOINT=local-test PORT=3111 node reemplazo/src/server.js

# validación completa contra el local: 20 ejemplos + 34 control + 62 batería
python3 -m venv .venv && .venv/bin/pip install -r reto2-investigacion/requirements.txt
.venv/bin/python reto2-investigacion/scripts/validar.py \
  --url http://localhost:3111 --token local-test
```

Docker: `docker build -t caja-negra-reemplazo reemplazo`.

## Video demo (2 min)

`public/demo.mp4` (servido en `https://frontier-labs-reto.vercel.app/demo.mp4`).
Guion y timestamps: [`demo-video/GUION_VOZ.md`](demo-video/GUION_VOZ.md).

```bash
cd demo-video && npm i
npx remotion render la-caja-negra-demo out/demo.mp4
cd .. && tools/publish-demo.sh     # copia el último render a public/demo.mp4
```

## Configuración (secretos)

| Variable | Dónde | Uso |
| --- | --- | --- |
| `TOKEN_API_ENTRYPOINT` | Vercel | Token del equipo para el entrypoint |
| `DATABASE_URL` | Vercel | Conexión *pooled* de Neon |
| `MONITOR_TOKEN` / `CRON_SECRET` | Vercel + GitHub | Autentica `/api/monitor/*` |
| `URL_API_ENTRYPOINT` / `TOKEN_CAJA_NEGRA` | GitHub | Original a estudiar |
| `OPENROUTER_API_KEY` | GitHub | Modelo del enjambre |
| `VERCEL_TOKEN` | GitHub | Leer logs de Vercel desde el enjambre |

No publicar `.env`, tokens, DB locales ni capturas con credenciales.

## Documentación

| Necesidad | Fuente |
| --- | --- |
| Video demo (2 min) | [MP4](public/demo.mp4) · [guion](demo-video/GUION_VOZ.md) · [fuente](demo-video) |
| Especificación del servicio (entregable) | [HTML](public/entregas/03-especificacion-servicio.html) · [PDF](public/entregas/03-especificacion-servicio.pdf) · [SPEC.md](reto2-investigacion/SPEC.md) |
| Log de experimentos (entregable) | [Markdown](public/entregas/04-log-experimentos.md) · [JSONL](reto2-investigacion/experimentos.jsonl) |
| Diseño para entregar | [HTML](public/entregas/01-diseno-sistemas.html) · [PDF](public/entregas/01-diseno-sistemas.pdf) |
| Diagrama para entregar | [HTML](public/entregas/02-diagrama-arquitectura.html) · [PDF](public/entregas/02-diagrama-arquitectura.pdf) |
| Índice de entregas | [public/entregas/index.html](public/entregas/index.html) |
| Validar log + evidencia del SPEC | [validar_spec.py](reto2-investigacion/scripts/validar_spec.py) |
| Generar entregables 03/04 | [tools/build-entregas.py](tools/build-entregas.py) |
| Integración continua | [.github/workflows/ci.yml](.github/workflows/ci.yml) (tests + evidencia + entregas al día) |
| Enjambre de agentes (roles, CI/CD) | [agent/README.md](agent/README.md) |
| Observabilidad (qué vemos) | [docs/observabilidad.md](docs/observabilidad.md) |
| Workflows (monitor + swarm) | [.github/workflows](.github/workflows) · [runs](https://github.com/AndreSierraM/frontier_labs_reto/actions) |
| Laboratorio E2E (original falso) | [api/lab](api/lab) · cadena monitor → enjambre → PR en los runs |
| Cronología e incidente | [Bitácora](reto2-investigacion/BITACORA.md) |
| Regenerar PDF de entregas | [tools/render-entregas.py](tools/render-entregas.py) |

## Estado y límites

- Validación local: **20/20** ejemplos, **34/34** control y **62/62** batería
  (**116/116**) + **21/21** unitarias.
- Log de experimentos: **366 observaciones** (IDs 1–366, JSONL válido); cada
  comportamiento del SPEC cita **IDs exactos** del log, verificados por
  `reto2-investigacion/scripts/validar_spec.py`.
- Especificación: **75 comportamientos** con ID, evidencia y confianza;
  `validar_spec.py` comprueba esquema del log y correspondencia de la evidencia
  (**OK**). Entregables en `public/entregas/03-*` y `public/entregas/04-*`.
- El evaluador usa 100 tests, reset antes de cada test y máximo 5s por paso;
  compara status y cuerpo.
- **Rate-limit de infraestructura:** el original responde `429 {"infra":"rate-limit"}`
  (no es comportamiento del servicio, SPEC I-11); el monitor lo detecta y no lo
  toma como cambio.
- El enjambre **abre PR, no mergea**; mergear dispara deploy en Vercel.
- Persistencia: una fila JSONB en Postgres con `SELECT ... FOR UPDATE`
  (serializa escrituras). SQLite/Node 24 son propuestas, no runtime actual.
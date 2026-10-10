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

## Estructura del repositorio

```text
frontier-reto-2/            Material oficial del reto, sin modificar
reto2-investigacion/        Investigación, SPEC, bitácora y evidencia
  reemplazo/ → ver reemplazo/ (paquete ejecutable)
  scripts/                   Sondas, validación y diferencial
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
docs/                       Diseño, arquitectura y evidencia
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
| Diseño para entregar | [HTML](docs/entregables/01-diseno-sistemas.html) · [PDF](docs/entregables/01-diseno-sistemas.pdf) |
| Diagrama para entregar | [HTML](docs/entregables/02-diagrama-arquitectura.html) · [PDF](docs/entregables/02-diagrama-arquitectura.pdf) |
| Decisiones completas | [Diseño](docs/01-diseno.md) · [Arquitectura](docs/02-arquitectura.md) |
| Enjambre de agentes | [agent/README.md](agent/README.md) |
| Pruebas E2E (laboratorio) | [docs/lab-e2e](docs/lab-e2e/README.md) |
| Comportamiento observado | [SPEC](reto2-investigacion/SPEC.md) · [experimentos](reto2-investigacion/experimentos.jsonl) |
| Cronología e incidente | [Bitácora](reto2-investigacion/BITACORA.md) |
| Índice completo | [docs/README.md](docs/README.md) |

## Estado y límites

- Validación local: **20/20** ejemplos, **34/34** control y **62/62** batería
  (**116/116**) + **21/21** unitarias.
- El evaluador usa 100 tests, reset antes de cada test y máximo 5s por paso;
  compara status y cuerpo.
- **Rate-limit de infraestructura:** el original responde `429 {"infra":"rate-limit"}`
  (no es comportamiento del servicio, SPEC I-11); el monitor lo detecta y no lo
  toma como cambio.
- El enjambre **abre PR, no mergea**; mergear dispara deploy en Vercel.
- Persistencia: una fila JSONB en Postgres con `SELECT ... FOR UPDATE`
  (serializa escrituras). SQLite/Node 24 son propuestas, no runtime actual.
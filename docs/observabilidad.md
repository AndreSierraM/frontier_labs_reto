# Observabilidad · qué vemos y cómo

El sistema observa **dos cosas a la vez**: el servicio **original** (para
detectar cambios) y **nuestro** servicio (para ver cómo funciona y auto-corregir).

## 1 · El original

| Sonda | Qué cubre | Dónde corre |
| --- | --- | --- |
| Batería (`monitor/battery.js`) | 31 puntos: contrato, comandos, límites, bloqueo, anulaciones | Función serverless (`/api/monitor/run`), rápido |
| Mapa ampliado (`monitor/probes.js`) | 101 sondas: batería + **descubrimiento** de comandos, rutas, montos y controles nuevos | GitHub Actions (`agent/recon.mjs`), sin límite de 60s |

- Cada corrida guarda un **snapshot** o un **mapa** en Neon y lo compara con el
  anterior. Un valor **nuevo** o **cambiado** registra un evento y despierta al
  enjambre.
- Se ignora `429/infra` (SPEC I-11): no es comportamiento del servicio.

Endpoints (protegidos con `MONITOR_TOKEN`):

| Ruta | Uso |
| --- | --- |
| `GET /api/monitor/run` | Corre la batería contra el original y detecta cambios |
| `GET /api/monitor/status` | Último snapshot y eventos recientes |
| `GET/POST /api/monitor/map` | Último mapa del original / subir uno nuevo y comparar |
| `GET /api/monitor/dashboard` | Resumen para el panel (original + nuestro servicio) |
| `POST /api/monitor/ack` | Marca un cambio como atendido |

## 2 · Nuestro servicio

- Cada request a la API se registra en `runtime_log` (método, ruta, status, ms)
  mediante un hook en `createHandler` (`reemplazo/src/server.js`). No altera el
  contrato y se poda a los 2 días.
- El **dashboard** (`/monitor`) muestra: estado del original, totales de la
  última hora (requests, 4xx/5xx, latencia media/máx), tabla por ruta,
  transacciones recientes y errores recientes.
- El enjambre además lee los **logs de Vercel** (`agent/lib/logs.mjs`) para ver
  errores de runtime de la API desplegada.

## 3 · Disparadores

| Disparador | Cuándo | Qué corre |
| --- | --- | --- |
| `schedule` | cada 15 min | `check` (batería) + `recon` (mapa) |
| `workflow_dispatch` `loop_minutes=0` | manual | `check` + `recon` |
| `workflow_dispatch` `loop_minutes=N` | demo day | tick inmediato + bucle cada 15 min (`check`) |

Si cualquiera detecta cambio, `monitor.yml` llama a `swarm.yml` en el **mismo
run** (workflow reutilizable) y aparece un PR.

## 4 · Tablas en Neon

`monitor_snapshots`, `monitor_maps`, `monitor_events`, `runtime_log`, `estado`,
`lab_estado`, `lab_config`.

## 5 · Ver en vivo

```bash
# panel visual
open https://frontier-labs-reto.vercel.app/monitor

# resumen JSON (requiere MONITOR_TOKEN)
curl -H "Authorization: Bearer $MONITOR_TOKEN" \
  https://frontier-labs-reto.vercel.app/api/monitor/dashboard
```
# Observabilidad · qué vemos y cómo

El sistema observa **dos cosas a la vez**: el servicio **original** (para
detectar cambios) y **nuestro** servicio (para ver cómo funciona y auto-corregir).

## 1 · El original

| Sonda | Qué cubre | Dónde corre |
| --- | --- | --- |
| Batería (`monitor/probes.js` · `PROBES.battery`) | 31 puntos: contrato, comandos, límites, bloqueo, anulaciones | Función serverless (`/api/monitor/run`), rápido |
| Mapa ampliado (`monitor/probes.js` · `PROBES.all`) | 101 sondas: batería + **descubrimiento** de comandos, rutas, montos y controles nuevos | GitHub Actions (`agent/recon.mjs`), sin límite de 60s |

Datos vs lógica: `monitor/probes.js` es el **catálogo** (editable, auto-ensanchable)
con su **referencia de control congelada** (ISO 7064), sin depender del dominio del
reemplazo; `monitor/observe.js` es el **runner** (HTTP, ejecución) y
`monitor/compare.js` el **núcleo puro** de comparación (canonical, hashing, diff).
La taxonomía de eventos vive en `monitor/kinds.js`, y la puerta de verificación
(`agent/lib/verify.mjs`) es una función pura con adaptadores para el proceso y el monitor.

- Cada corrida guarda un **snapshot** o un **mapa** en Neon y lo compara con el
  anterior. Un valor **nuevo** o **cambiado** registra un evento y despierta al
  enjambre. Un comando candidato que deja de ser `E301` se marca `new_command`;
  una ruta que deja de ser 404, `new_route`.
- **Auto-ensanche:** cuando el enjambre adapta un comando/ruta nuevo, el fixer
  añade además una **sonda de regresión** a `monitor/probes.js`, de modo que el
  mapa sigue vigilando el comportamiento nuevo y la verificación lo cubre.
- La verificación exige 0 divergencias contra el original en **batería + mapa**.
- Se ignora `429/infra` (SPEC I-11): no es comportamiento del servicio. El 429 no
  descarta la toma completa: se filtran las muestras de infra (`withoutInfra`) y se
  compara el resto, de modo que un rate-limit parcial no oculta cambios.

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
- El **dashboard** (`/monitor`) es interactivo: pestañas (Nuestro servicio,
  Original, Enjambre), auto-refresh, log en vivo de transacciones, errores,
  eventos del monitor y **corridas del enjambre con su revisión**.
- El enjambre reporta cada corrida (`status`, etiquetas, revisión y **logs**:
  scout, diagnóstico, fixer, revisión y cuerpo del PR) vía
  `POST /api/monitor/agent`. En el panel, el botón **logs** de cada corrida abre
  un modal con lo que el agente **dijo e hizo**, más el enlace a Actions y al PR.
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
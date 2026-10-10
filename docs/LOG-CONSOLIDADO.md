# 📋 Log consolidado · Frontier Labs Reto 2 (La caja negra)

Generado: **2026-10-10T23:22:27.976Z** · Repo: `AndreSierraM/frontier_labs_reto` · Entrypoint: `https://frontier-labs-reto.vercel.app`

Este documento reúne, en un solo lugar, los logs de **experimentos**, **CI/CD (GitHub Actions)**, **despliegues (Vercel)**, **monitor**, **enjambre** y **diagnóstico**.

---

## 1 · Log de experimentos (`reto2-investigacion/experimentos.jsonl`)

- **Total: 394 observaciones** (IDs 1–394), JSONL válido.
- Cada comportamiento del SPEC cita IDs exactos; verificado por `validar_spec.py` (OK).

| Secuencia | Observaciones |
| --- | ---: |
| `integridad` | 16 |
| `aridad` | 30 |
| `alta` | 11 |
| `consulta` | 7 |
| `deposito` | 22 |
| `transfer` | 14 |
| `anula` | 16 |
| `estado` | 5 |
| `bordes` | 42 |
| `bloqueo` | 76 |
| `bloqueo3` | 39 |
| `max` | 12 |
| `sugerencia` | 18 |
| `bloqueo4` | 28 |
| `sugerencia2` | 11 |
| `gaps` | 19 |
| `incidente-v2` | 28 |

### 1.1 · Observaciones del incidente v2 (IDs 367–394)

| id | request | status | response |
| ---: | --- | ---: | --- |
| 367 | `POST /__reset` | 200 | `{"ok":true}` |
| 368 | `ALTA;A;62` | 201 | `{"cuentaId":"AC-0001"}` |
| 369 | `DEPOSITO;AC-0001;100;82` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` |
| 370 | `CONSULTA;AC-0001;14` | 200 | `{"cuenta_id":"AC-0001","saldo":"1.00"}` |
| 371 | `DEPOSITO;AC-0001;250000;86` | 200 | `{"status":"recieved","operacionId":"OP-0002"}` |
| 372 | `CONSULTA;AC-0001;14` | 200 | `{"cuenta_id":"AC-0001","saldo":"2501.00"}` |
| 373 | `ALTA;B;59` | 201 | `{"cuentaId":"AC-0002"}` |
| 374 | `TRANSFER;AC-0001;AC-0002;50000;59` | 200 | `{"status":"recieved","operacionId":"OP-0003"}` |
| 375 | `TRANSFER;AC-0001;AC-0002;50001;56` | 422 | `{"error":"E506","mensaje":"límite excedido"}` |
| 376 | `TRANSFER;AC-0001;AC-0002;100000;12` | 422 | `{"error":"E506","mensaje":"límite excedido"}` |
| 377 | `TRANSFER;AC-0001;AC-0002;100001;9` | 422 | `{"error":"E506","mensaje":"límite excedido"}` |
| 378 | `HALT;AC-0001;82` | 409 | `{"error":"E520","mensaje":"operación destructiva: detiene el servicio; reenvía c` |
| 379 | `NOTAS;11` | 200 | `{"notas":[{"id":"N-01","texto":"Pendiente de la migración: exporta la documentac` |
| 380 | `TRANSFER;AC-0001;AC-0002;10;13` | 423 | `{"error":"E510","mensaje":"cuenta bloqueada","intentos":1}` |
| 381 | `TRANSFER;AC-0001;AC-0002;10;13` | 423 | `{"error":"E510","mensaje":"cuenta bloqueada","intentos":2}` |
| 382 | `DEPOSITO;AC-0001;1;28` | 200 | `{"status":"recieved","operacionId":"OP-0004"}` |
| 383 | `TRANSFER;AC-0001;AC-0002;10;13` | 200 | `{"status":"recieved","operacionId":"OP-0005"}` |
| 384 | `POST /internal/export-docs` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` |
| 385 | `pıng;XX` | 400 | `{"error":"E201","mensaje":"control mal formado"}` |
| 386 | `pıng;60` | 400 | `{"error":"E301","mensaje":"comando desconocido ","sugerencia":"PING"}` |
| 387 | `HALT;1;19` | 503 | `{"error":"E599","mensaje":"service halted"}` |
| 388 | `PING;64` | 503 | `{"error":"E599","mensaje":"service halted"}` |
| 389 | `POST /__reset` | 200 | `{"ok":true}` |
| 390 | `PING;64` | 200 | `{"pong":true}` |
| 391 | `ALTA;A;62` | 201 | `{"cuentaId":"AC-0001"}` |
| 392 | `ALTA;A;62` | 201 | `{"cuentaId":"AC-0002"}` |
| 393 | `DEPOSITO;AC-0001;100000;6` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` |
| 394 | `TRANSFER;AC-0001;AC-0002;50001;56` | 200 | `{"status":"recieved","operacionId":"OP-0002"}` |

---

## 2 · CI/CD · GitHub Actions

Workflows: `ci.yml` (tests+evidencia+entregables), `monitor.yml` (vigilancia), `swarm.yml` (enjambre).

| Fecha (UTC) | Workflow | Resultado | Trigger | Título |
| --- | --- | --- | --- | --- |
| 2026-10-10T23:14:46Z | ci | success | push | docs(incidente): quirk E506 con mismo nombre (IDs 391-394) e |
| 2026-10-10T23:12:57Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T23:11:47Z | ci | success | push | fix(monitor): re-baseline tambien si el snapshot no tiene cl |
| 2026-10-10T23:07:57Z | ci | success | push | fix(reemplazo): E506 no aplica con el mismo nombre en origen |
| 2026-10-10T22:56:54Z | ci | success | push | docs(incidente): ASCII-only + HALT;1 (E599) en SPEC/BITACORA |
| 2026-10-10T22:54:47Z | ci | success | push | fix(reemplazo): match de comando ASCII-only y HALT;1 apaga e |
| 2026-10-10T22:42:53Z | ci | success | push | fix(monitor+swarm): re-baseline por catalogo, timeout del an |
| 2026-10-10T22:11:46Z | monitor | failure | workflow_dispatch | monitor |
| 2026-10-10T22:11:02Z | ci | success | push | feat(monitor+reemplazo): capturar peticion/respuesta y ampli |
| 2026-10-10T22:06:44Z | ci | success | push | fix(reemplazo): umbral E506 v2 = 50000 (antes 100000) |
| 2026-10-10T21:56:16Z | ci | success | push | feat(reemplazo): adaptar a la v2 del original (incidente #FR |
| 2026-10-10T21:43:38Z | ci | success | push | chore: guardar las secuencias de status reconstruidas del se |
| 2026-10-10T21:42:48Z | ci | success | push | chore: limpieza de scripts/docs, demo v8 y escaner privado |
| 2026-10-10T21:39:37Z | ci | success | push | chore(monitor): endpoint temporal de diagnostico para volcar |
| 2026-10-10T21:20:26Z | monitor | cancelled | workflow_dispatch | monitor |
| 2026-10-10T21:20:14Z | ci | success | push | perf(monitor): bajar el intervalo de deteccion a 10 min |
| 2026-10-10T21:17:36Z | monitor | cancelled | workflow_dispatch | monitor |
| 2026-10-10T21:16:19Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T21:15:18Z | ci | success | push | feat(monitor): deteccion tolerante a rate-limit parcial + re |
| 2026-10-10T21:11:52Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T21:06:58Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T21:05:42Z | ci | success | push | chore: rate-limit del monitor + refactor compare/kinds y che |
| 2026-10-10T20:59:29Z | swarm | success | workflow_dispatch | swarm |
| 2026-10-10T20:32:48Z | ci | success | push | docs: los logs del agente se ven en el panel |
| 2026-10-10T20:32:29Z | monitor | success | schedule | monitor |
| 2026-10-10T20:26:52Z | swarm | success | workflow_dispatch | swarm |
| 2026-10-10T20:25:17Z | ci | success | push | feat(monitor): guardar y ver los logs del agente (scout, dia |
| 2026-10-10T20:21:03Z | ci | success | push | chore(web): evita peticiones de favicon (ruido 4xx) |
| 2026-10-10T20:17:45Z | swarm | success | workflow_dispatch | swarm |
| 2026-10-10T20:13:27Z | ci | success | push | feat(monitor): panel publico de solo lectura (sin token); ac |
| 2026-10-10T20:11:03Z | monitor | cancelled | workflow_dispatch | monitor |
| 2026-10-10T20:08:36Z | ci | success | push | chore(vercel): excluir demo-video y tools del deploy |
| 2026-10-10T20:08:29Z | ci | success | push | chore: integrar video demo (Remotion), entregas reestructura |
| 2026-10-10T20:06:52Z | ci | failure | push | feat(monitor): linea de tiempo que une cambio -> corrida ->  |
| 2026-10-10T20:04:57Z | ci | failure | push | feat(monitor): corridas del enjambre con enlaces a Actions/P |
| 2026-10-10T20:02:33Z | ci | failure | push | feat(monitor): gate del revisor (bloquea PR y reintenta), co |
| 2026-10-10T18:59:55Z | swarm | success | workflow_dispatch | swarm |
| 2026-10-10T18:59:19Z | monitor | cancelled | workflow_dispatch | monitor |
| 2026-10-10T18:48:41Z | monitor | cancelled | workflow_dispatch | monitor |
| 2026-10-10T18:48:17Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T18:43:43Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T18:43:17Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T18:38:47Z | monitor | failure | workflow_dispatch | monitor |
| 2026-10-10T18:38:07Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T18:31:21Z | monitor | cancelled | workflow_dispatch | monitor |
| 2026-10-10T18:28:05Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T18:25:35Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T18:25:33Z | monitor | failure | workflow_dispatch | monitor |
| 2026-10-10T18:01:40Z | swarm | success | workflow_dispatch | swarm |
| 2026-10-10T17:50:05Z | swarm | failure | workflow_dispatch | swarm |
| 2026-10-10T17:29:24Z | swarm | cancelled | workflow_dispatch | swarm |
| 2026-10-10T17:01:04Z | monitor | success | workflow_dispatch | monitor |
| 2026-10-10T16:55:45Z | monitor | success | workflow_dispatch | monitor |

> `ci.yml` en verde en todos los pushes; el único fallo del `monitor` (run `38090501395`) fue por el timeout del analista + falsos positivos al ampliar la batería, ya corregido (re-baseline).

---

## 3 · Despliegues · Vercel (producción)

| Deployment (últimos 20) |
| --- |
| 7m cabalastechhub/frontier-labs-reto https://frontier-labs-reto-gly0jn4cl-cabalastechhub.vercel.app ● Ready Production 29s andresierram |
| 10m cabalastechhub/frontier-labs-reto https://frontier-labs-reto-zkpyti0ie-cabalastechhub.vercel.app ● Ready Production 23s andresierram |
| 14m cabalastechhub/frontier-labs-reto https://frontier-labs-reto-7czwtlsde-cabalastechhub.vercel.app ● Ready Production 20s andresierram |
| 25m cabalastechhub/frontier-labs-reto https://frontier-labs-reto-nq8b2c74k-cabalastechhub.vercel.app ● Ready Production 6s andresierram |
| 27m cabalastechhub/frontier-labs-reto https://frontier-labs-reto-5lg7zfxtt-cabalastechhub.vercel.app ● Ready Production 8s andresierram |
| 39m cabalastechhub/frontier-labs-reto https://frontier-labs-reto-qa1x92vtq-cabalastechhub.vercel.app ● Ready Production 8s andresierram |
| 1h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-aw7hvcx6c-cabalastechhub.vercel.app ● Ready Production 8s andresierram |
| 1h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-379zy980p-cabalastechhub.vercel.app ● Ready Production 8s andresierram |
| 1h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-r017j9xng-cabalastechhub.vercel.app ● Ready Production 8s andresierram |
| 1h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-mnkbbu6ok-cabalastechhub.vercel.app ● Ready Production 8s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-1fgp49b6e-cabalastechhub.vercel.app ● Ready Production 14s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-7ah6ftvw6-cabalastechhub.vercel.app ● Ready Production 9s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-9ys2jgep3-cabalastechhub.vercel.app ● Ready Production 9s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-cdfz98bps-cabalastechhub.vercel.app ● Ready Production 10s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-15y93jj9o-cabalastechhub.vercel.app ● Ready Production 9s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-4h8oopzgm-cabalastechhub.vercel.app ● Ready Production 9s andresierram |
| 2h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-pb1thu10g-cabalastechhub.vercel.app ● Ready Production 21s andresierram |
| 3h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-l8z3sbctu-cabalastechhub.vercel.app ● Ready Production 9s andresierram |
| 3h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-k6guibul8-cabalastechhub.vercel.app ● Ready Production 19s andresierram |
| 3h cabalastechhub/frontier-labs-reto https://frontier-labs-reto-gmtxe5erh-cabalastechhub.vercel.app ● Ready Production 31s andresierram |

---

## 4 · Monitor · eventos y estado

- Snapshots del original: **hay baseline**.
- Ventana de runtime (reemplazo): {"n":1944,"errors5xx":9,"errors4xx":747,"avg_ms":1,"max_ms":80}.

| Detectado (UTC) | Tipo | Etiqueta | Detalle |
| --- | --- | --- | --- |
| 2026-10-10T22:12:19.401Z | map_value_changed | monto:1000000000 | respuesta cambiada |
| 2026-10-10T22:12:19.398Z | map_value_changed | monto:999999999 | respuesta cambiada |
| 2026-10-10T22:12:19.395Z | map_value_changed | monto:10 | respuesta cambiada |
| 2026-10-10T22:12:19.393Z | map_value_changed | monto:9 | respuesta cambiada |
| 2026-10-10T22:12:19.391Z | map_value_changed | monto:1 | respuesta cambiada |
| 2026-10-10T22:12:19.388Z | new_command | cmd:NOTAS | comando nuevo |
| 2026-10-10T22:12:19.386Z | new_command | cmd:HALT | comando nuevo |
| 2026-10-10T22:12:19.383Z | map_value_changed | cmd:HELP | respuesta cambiada |
| 2026-10-10T22:12:19.381Z | map_added | lim-50001 | respuesta cambiada |
| 2026-10-10T22:12:19.379Z | map_added | lim-50000 | respuesta cambiada |
| 2026-10-10T22:12:19.378Z | map_added | lim-saldo | respuesta cambiada |
| 2026-10-10T22:12:19.376Z | map_added | lim-dep | respuesta cambiada |
| 2026-10-10T22:12:19.373Z | map_added | lim-B | respuesta cambiada |
| 2026-10-10T22:12:19.371Z | map_added | lim-A | respuesta cambiada |
| 2026-10-10T22:12:19.369Z | map_added | lim-reset | respuesta cambiada |

---

## 5 · Enjambre · corridas (`agent_runs`)

| Fecha (UTC) | Estado | Etiquetas | Run | PR |
| --- | --- | --- | --- | --- |
| 2026-10-10T22:30:26.092Z | failed | monto:1000000000,monto:999999999,monto:10,monto:9,monto:1,cm | https://github.com/AndreSierraM/frontier_labs_reto/actions/runs/38090501395 | — |
| 2026-10-10T21:00:05.438Z | failed |  | https://github.com/AndreSierraM/frontier_labs_reto/actions/runs/38085887325 | — |
| 2026-10-10T20:32:01.709Z | no-patch | T-limite | https://github.com/AndreSierraM/frontier_labs_reto/actions/runs/38083780784 | — |
| 2026-10-10T20:20:10.572Z | no-patch | T-limite | https://github.com/AndreSierraM/frontier_labs_reto/actions/runs/38083180540 | — |

---

## 6 · Diagnóstico / escáner

- Escáner privado (`tools/watch-map.js`, `tools/scan-probes.js`): 192 sondas (40 batería + 152 descubrimiento).
- Diferencial completo contra el log (`tools/diff-full.js`):
```json
{"n":424,"diffs":0}
```

### Últimas líneas del vigilante (`logs/watch-map/watch.log`)
```
[2026-10-10T21:43:58.127Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:44:58.464Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:45:58.697Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:46:58.922Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:47:59.557Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:48:59.791Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:50:00.035Z] bloqueado (probe=429); reintento en 60000 ms
[2026-10-10T21:51:00.269Z] bloqueado (probe=429); reintento en 60000 ms
```

---

## 7 · Incidente v2 · los 6 cambios (detectados y adaptados)

| # | Comportamiento | Antes (v1) | Después (v2) |
| ---: | --- | --- | --- |
| 1 | `CONSULTA` saldo | `saldo: N` (número) | `saldo: "S.DD"` (cadena decimal, centavos) |
| 2 | `E506` umbral | `monto > 100000` | `monto > 50000` y **solo si los nombres difieren** |
| 3 | `E510` | `409` sin `intentos` | `423` + `intentos` |
| 4 | Comandos nuevos | — | `HALT` (`409 E520`), `NOTAS` (200) |
| 5 | Match de comando | Unicode `toUpperCase` | **ASCII-only** (`pıng` ≠ `PING`) |
| 6 | `HALT;1` | `409 E520` | `503 E599 "service halted"` hasta `__reset` |

---

## 8 · Verificación del reemplazo

- **Replay exacto de la corrida 03** del set oculto (107 tests, peticiones reales en `runtime_log`): **0 divergencias** original vs reemplazo desplegado.
- Set oculto: **77/100 → 94/100** tras los cambios v2; con los 3 últimos arreglos (ASCII, HALT, E506 nombre) el replay queda en 0.


---

## 3.1 · Vercel runtime logs (última hora, producción)

| método path [status] | n |
| --- | ---: |
| `POST /msg [200]` | 16 |
| `POST /__reset [200]` | 7 |
| `POST /msg [201]` | 7 |
| `POST /msg [422]` | 6 |
| `POST /msg [423]` | 3 |
| `GET /api/monitor/dashboard [200]` | 2 |
| `POST /msg [503]` | 2 |
| `GET /favicon.ico [401]` | 1 |
| `GET /apple-touch-icon.png [401]` | 1 |
| `GET /apple-touch-icon-precomposed.png [401]` | 1 |
| `POST /api/monitor/map [200]` | 1 |
| `GET /health [200]` | 1 |
| `GET /api/monitor/run [200]` | 1 |
| `POST /msg [404]` | 1 |

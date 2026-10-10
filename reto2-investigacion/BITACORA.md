# Bitácora · La caja negra (Reto 2)

Narrativa de qué pasó, qué encontramos y cómo reaccionar. Las piezas crudas son
[`experimentos.jsonl`](experimentos.jsonl) (**366 observaciones**) y las fotos de
estado en [`logs/snapshots/`](logs/snapshots/).

> Zona horaria: el evento se comunica en hora **BOG (UTC−5)**. En UTC, el incidente
> agendado a las **15:30 BOG = 20:30 UTC**.

---

## 1 · Cronología de la investigación

| Hora (UTC) | Hito | Qué pasó | Evidencia |
| --- | --- | --- | --- |
| ~14:59 | Acceso | `health`/`msg` con el token `ftr_...` daban `401`. Se descubre que el token válido es `TOKEN_CAJA_NEGRA` (`cn-p-...`). | `experimentos.jsonl` 1–16 |
| ~15:00 | Rutas/auth | Se mapean rutas, métodos, `E001`, `E404`, `x-req`, rate-limit de infraestructura. | `probe_recon`, `probe_xreq` |
| ~15:05–15:15 | Integridad | Se descubre que el último campo es un control; `E103`, `E104`, `E201`, `E202`; `PING` lo ignora. | 1–46 |
| ~15:10 | Crack del control | 6 scripts propios fallan (sumas, CRC, hashes, afines). Se halla la pista ISO 7064 en un repo público y **se valida 34/34 con dataset propio**. | `data/pares_control.jsonl` |
| ~15:15–15:25 | Comandos | Aridad exacta, montos, límite 100000, `E506`/`E507`, `E304`, `E401`, `E402`; reversos de `ANULA`. | 47–121 |
| ~15:25 | 🕵️ Hallazgo | Aparece `409 E510 "cuenta bloqueada"` durante un barrido de bordes. No está en los ejemplos ni en el material. | 122–163 |
| ~15:28–15:35 | Caracterización | Se aísla la regla: 3 fallos de transferencia (`E506`/`E507`) bloquean; depósito/éxito reinician; `ANULA` no desbloquea. | 164–278, 309–336 |
| ~15:35 | Reemplazo | Núcleo puro (`domain.js`) + adaptador (`server.js`); **20/20** ejemplos, **116/116** validación (`validar.py`) y **21/21** unitarias (`npm test`); diferencial **75/78** (3 por reintentos). | `verificar.py`, `validar.py`, `prueba_diferencial.py` |
| ~15:40 | Vigilancia | Línea base de 31 puntos (`logs/snapshots/…`); segunda pasada: **sin cambios**. | `vigilancia.py` |
| ~13:30 UTC | Gaps cerrados | Se cubren los comportamientos sin ID de log (`E001`, `E100`, `E101`, `E102`, `E404`, `x-req`, rate-limit, Content-Type). Se añaden 19 observaciones locales (IDs 348–366). | `cubrir_gaps_local.py` |

Sobre el **incidente de las 15:30 BOG (20:30 UTC)**: aún no ocurre. La batalla de
`E510` es un comportamiento **preexistente** del servicio, no el cambio anunciado.
La vigilancia ya está lista para detectar el cambio real.

---

## 2 · Qué encontramos (resumen entendible)

1. **El servicio habla un protocolo propio**: `COMANDO;arg1;…;control` por `POST /msg`.
2. **La "firma" de cada mensaje** es un dígito de control tipo IBAN (ISO 7064 MOD 97-10).
   Sin ella no se ejecuta nada (salvo `PING`).
3. **El estado vive en memoria**: cuentas `AC-%04d`, operaciones `OP-%04d`, saldos y
   contadores que `POST /__reset` limpia.
4. **Hay una regla antifraude oculta (`E510`)**: tras 3 transferencias fallidas
   (`E506`/`E507`), la cuenta queda bloqueada para transferir; un depósito la desbloquea.
5. Los errores tienen **precedencia fija** y mensajes exactos (incluido el typo `recieved`).
6. Todas las filas del SPEC ahora citan IDs concretos del log; no quedan afirmaciones sin evidencia ni referencias genéricas (`probe_recon`, `pendiente #3`).

Detalle completo: [`SPEC.md`](SPEC.md) y [`README.md`](README.md).

---

## 3 · Cómo reaccionar (playbook)

### 3.1 Detectar el cambio (incidente de las 20:30 UTC)

**En producción**, la vigilancia ya corre en la nube: GitHub Actions llama cada
15 min (o en bucle) al monitor en Vercel, que ejecuta esta misma batería contra
el original y guarda snapshots y eventos en Neon. Si detecta un cambio, dispara
al enjambre, que abre un PR. Ver [`agent/README.md`](../agent/README.md) y los
runs de [GitHub Actions](https://github.com/AndreSierraM/frontier_labs_reto/actions).

Para reproducirlo en local:

```bash
cd reto2-investigacion
python3 scripts/vigilancia.py        # crea foto y compara con la anterior
```

- Imprime `sin cambios` o lista las etiquetas que cambiaron (`E510`, límites, etc.).
- Programar cada ~15 min (`while true; do python3 scripts/vigilancia.py; sleep 900; done`).
- Las fotos quedan en `logs/snapshots/<UTC>.json` y son el **antes/después**.

### 3.2 Al detectar un cambio

1. **Registrar**: hora UTC/BOG, etiqueta, valor antes y después (lo imprime `vigilancia.py`).
2. **Aislar**: reproducir con `explorar.py` la sección afectada (p. ej. `transfer`).
3. **Entender**: formular hipótesis y añadir casos al `experimentos.jsonl`
   (`send_and_log`).
4. **Adaptar**: desde la raíz del repo, reglas en `reemplazo/src/domain.js`; transporte en `reemplazo/src/server.js`. Actualizar `SPEC.md` con el `id` del log.
5. **Verificar**: `verificar.py` (20/20) + `prueba_diferencial.py` (coincidencias).
6. **Anotar** en esta bitácora (tabla de la sección 4).
7. **Desplegar** la versión adaptada.

### 3.3 Criterio de aceptación

| Prueba | Debe dar |
| --- | --- |
| `verificar.py` vs 20 ejemplos | 20/20 |
| `validar.py` (ejemplos + control + batería) | 116/116 |
| `npm test` (dominio puro) | 21/21 |
| `prueba_diferencial.py` | todas las diferencias explicadas (ideal: 100%) |
| `control.py` vs `data/pares_control.jsonl` | 34/34 |
| `vigilancia.py` | `sin cambios` cuando el original no cambió |

---

## 4 · Registro del incidente (15:30 BOG / 20:30 UTC)

Fuente del cambio: `GET /api/monitor/dashboard` → `events` (kinds `original_changed`,
`new_command`, `new_route`, `map_value_changed`) y la línea de tiempo en
[`/monitor`](https://frontier-labs-reto.vercel.app/monitor). El enjambre reporta cada
corrida a `/api/monitor/agent` (estado, etiquetas, revisión, run y PR).

| Hora (UTC / BOG) | Etiqueta | Antes | Después | id log | Adaptación (PR) | Commit | Desplegado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-10 21:51Z / 16:51 | `CONSULTA` / `SALDO` | `{"cuenta_id":"AC-0001","saldo":100}` | `{"cuenta_id":"AC-0001","saldo":"1.00"}` | 370, 372 | `reemplazo/src/domain.js` (saldo decimal) | `ce7aba2` | sí |
| 2026-10-10 21:51Z / 16:51 | `T-50001` / `T-100000` | `E506` solo si `monto > 100000` | `E506` si `monto > 50000` | 375, 376 | `domain.js` (umbral 50000) | `ce7aba2` | sí |
| 2026-10-10 21:51Z / 16:51 | `E510` | `409 {"error":"E510","mensaje":"cuenta bloqueada"}` | `423 {...,"intentos":N}` | 380, 381 | `domain.js` (status + `intentos`) | `ce7aba2` | sí |
| 2026-10-10 21:51Z / 16:51 | `HALT` / `NOTAS` / `E520` | `400 E301 comando desconocido` | `HALT`→`409 E520`; `NOTAS`→`200 {notas:[...]}` | 378, 379 | `domain.js` (comandos + error E520) | `ce7aba2` | sí |
| 2026-10-10 22:44Z / 17:44 | `pıng` (i sin punto) | `200 {pong:true}` (lo tratábamos como PING) | `400 E201` / `400 E301 sugerencia PING` | 385, 386 | `domain.js` (match ASCII-only) | `46fa1fc` | sí |
| 2026-10-10 22:44Z / 17:44 | `HALT;1` | `409 E520` (siempre) | `503 E599 "service halted"` y todo `/msg` 503 hasta `__reset` | 387–390 | `domain.js` (estado `halted`) | `46fa1fc` | sí |
| 2026-10-10 23:07Z / 18:07 | `TRANSFER` con mismo nombre | `422 E506` (monto>50000) | `200` (E506 **solo** si los nombres difieren; si coinciden, cae a E507) | 391–394 | `domain.js` (E506 condicionado al nombre) | `1f22e74` | sí |
| 2026-10-10 23:07Z / 18:07 | `TRANSFER` con mismo nombre | `422 E506` (monto>50000) | `200` (E506 **solo** si los nombres difieren; si no, cae a E507) | 391–394 | `domain.js` (E506 condicionado al nombre) | `1f22e74` | sí |

**Nota:** el cambio se anunció 20:30 UTC, pero no fue observable hasta las 21:51 UTC
(el token anterior quedó en `429`); se detectó con el escáner diferencial
(original vs reemplazo, 399 pasos) y se confirmó en el original con el token nuevo.

---

## 5 · Dónde está cada cosa

| Recurso | Ruta |
| --- | --- |
| Observaciones con hipótesis | `experimentos.jsonl` |
| Fotos de estado (antes/después) | `logs/snapshots/*.json` |
| Especificación | `SPEC.md` |
| Informe/hallazgos | `README.md` |
| Paquete ejecutable de entrega | `../reemplazo/README.md` |
| Detector de cambios (local) | `scripts/vigilancia.py` |
| Monitor + enjambre (desplegado) | `../agent/README.md` |
| Prueba E2E y cadena automática | runs de GitHub Actions (`../.github/workflows/`) |
| Validación de la spec | `scripts/validar_spec.py` |
| Entregables (especificación y log) | `../public/entregas/03-especificacion-servicio.html`, `../public/entregas/04-log-experimentos.md` |

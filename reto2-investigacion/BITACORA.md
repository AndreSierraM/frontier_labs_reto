# Bitácora · La caja negra (Reto 2)

Narrativa de qué pasó, qué encontramos y cómo reaccionar. Las piezas crudas son
[`experimentos.jsonl`](experimentos.jsonl) (347 observaciones) y las fotos de
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

Detalle completo: [`SPEC.md`](SPEC.md) y [`README.md`](README.md).

---

## 3 · Cómo reaccionar (playbook)

### 3.1 Detectar el cambio (incidente de las 20:30 UTC)

**En producción**, la vigilancia ya corre en la nube: GitHub Actions llama cada
15 min (o en bucle) al monitor en Vercel, que ejecuta esta misma batería contra
el original y guarda snapshots y eventos en Neon. Si detecta un cambio, dispara
al enjambre, que abre un PR. Ver [`agent/README.md`](../agent/README.md) y
[`docs/lab-e2e/cadena-automatica.md`](../docs/lab-e2e/cadena-automatica.md).

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
6. **Anotar** en `docs/plantillas/07-incidente.md` (ruta desde la raíz) y en esta bitácora (tabla de la sección 4).
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

## 4 · Registro del incidente (a completar cuando ocurra)

| Hora | Fuente | Cambio detectado | Antes | Después | Adaptación | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-10T18:59:49Z | Monitor `T-limite` (`agent/state/2026-10-10T19-00-25-777Z/changes.json`) | `E506`: solo cambia el texto del mensaje | `422 {"error":"E506","mensaje":"límite excedido"}` | `422 {"error":"E506","mensaje":"limite superado"}` | `reemplazo/src/domain.js` (`ERRORES.E506`), tests de dominio/HTTP y `SPEC.md` | — |

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
| Prueba E2E y cadena automática | `../docs/lab-e2e/` |
| Plantilla de preparación del incidente | `../docs/plantillas/07-incidente.md` |

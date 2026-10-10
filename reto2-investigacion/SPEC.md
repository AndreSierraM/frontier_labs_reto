# Spec · Reto 2 "La caja negra"

Especificación reimplementable del servicio. Cada comportamiento cita líneas de
[`experimentos.jsonl`](experimentos.jsonl) (campo `id`).

Convenciones de confianza: **confirmado** (probado y se repite), **probable**
(visto una vez o inferido), **supuesto** (no probado; es el default del reemplazo).

Secuencias del log: `integridad` (1–16), `aridad` (17–46), `alta` (47–57),
`consulta` (58–64), `deposito` (65–86), `transfer` (87–100), `anula` (101–116),
`estado` (117–121), `bordes` (122–163), `bloqueo` (164–239),
`bloqueo3` (240–278), `max` (279–290), `sugerencia` (291–308),
`bloqueo4` (309–336), `sugerencia2` (337–347).

---

## 1 · Entrada

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| I-01 | `GET /health` → `200 {"ok":true}` (con token). | 1–16 (health en probes) | confirmado |
| I-02 | `POST /msg` recibe `{"m":"..."}`. | 1–347 | confirmado |
| I-03 | `POST /__reset` → `200 {"ok":true}` y limpia el estado (cuentas, operaciones y contadores). | 117–121 | confirmado |
| I-04 | Cualquier otra ruta/método → `404 {"error":"E404","mensaje":"ruta desconocida"}` (`GET /__reset`, `POST /health`, `GET/PUT/DELETE/OPTIONS /msg`, `/msg/`, `/`). | probe_recon | confirmado |
| I-05 | Todas las rutas exigen `Authorization: Bearer <token>`; ausente/incorrecto → `401 {"error":"E001","mensaje":"no autorizado"}`. El esquema `Bearer` es sensible a mayúsculas. | probe_recon | confirmado |
| I-06 | La cabecera `Content-Type` se ignora: se parsea JSON igual. | probe_recon | confirmado |
| I-07 | Cuerpo > 8191 bytes → `413 {"error":"E101","mensaje":"cuerpo demasiado grande"}`. | borde de tamaño | confirmado |
| I-08 | JSON inválido / cuerpo vacío → `400 {"error":"E100","mensaje":"json inválido"}`. | probe_recon | confirmado |
| I-09 | JSON válido sin `m` string (ausente, número, `null`) → `400 {"error":"E102","mensaje":"falta m"}`. Claves extra se ignoran. | probe_recon | confirmado |
| I-10 | La respuesta incluye cabecera `x-req` (contador global monótono, **no** lo reinicia `__reset`). | probe_xreq | confirmado |
| I-11 | El límite de infraestructura responde `429 {"infra":"rate-limit"}` con `X-Frontier-Infra`; no es comportamiento del servicio. | probe_recon | confirmado |

## 2 · Integridad (dígito de control)

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| C-01 | El último segmento `;`-separado es el **control**. | 1–347 | confirmado |
| C-02 | Sin separador `;` → `400 {"error":"E103","mensaje":"falta control"}`. | 1–16 | confirmado |
| C-03 | Algún segmento vacío → `400 {"error":"E104","mensaje":"segmento vacío"}` (tiene prioridad sobre el control). | 1–16 | confirmado |
| C-04 | Si el control no cumple `^\d{1,2}$` (3+ dígitos, signo, espacio, letras) → `400 {"error":"E201","mensaje":"control mal formado"}`. | 1–16 | confirmado |
| C-05 | Control con formato válido pero ≠ canónico → `400 {"error":"E202","mensaje":"control inválido"}` (`03` sí, `3` también; `003` no). | 1–16 | confirmado |
| C-06 | El control se calcula sobre el mensaje **sin su último campo**, con `ISO 7064 MOD 97-10` (verificador tipo IBAN): cada dígito vale su valor; cada letra `A=1…Z=26` (insensible a mayúsculas); `;`, `-`, espacios y no-ASCII no aportan. `control = 98 − (100·(N mod 97)) mod 97`, escrito sin ceros a la izquierda. | `data/pares_control.jsonl` (34/34), 291–347 | confirmado |
| C-07 | `PING` **ignora** el valor del control (`PING;0064`, `PING;abc` → `200`), pero sí exige que exista y no esté vacío. | 1–16 | confirmado |
| C-08 | Los comandos desconocidos **sí** validan el control antes de decidir que el comando no existe. | 122–163 | confirmado |

Implementación de referencia:

```python
def digitos(cuerpo):
    out = []
    for c in cuerpo:
        if c.isdigit() and c.isascii(): out.append(c)
        elif c.isascii() and c.isalpha(): out.append(str(ord(c.upper()) - 64))
    return "".join(out)

def control(cuerpo):
    r = 0
    for d in digitos(cuerpo): r = (r * 10 + int(d)) % 97
    return 98 - (r * 100) % 97
```

## 3 · Comandos

Orden general de evaluación: `E001` → `E100` → `E102` → `E103` → `E104` →
control (`E201`/`E202`, salvo `PING`) → `E301` (comando desconocido) → `E302`
(aridad) → reglas de negocio (`E303`, `E304`, `E401`, `E510`, `E506`, `E507`, `E402`).

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-00 | Comandos válidos (insensibles a mayúsculas): `PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`, `ANULA`. | 17–46, sugerencia | confirmado |
| K-01 | Aridad exacta (segmentos incluyendo control): `PING` 2, `ALTA` 3, `CONSULTA` 3, `DEPOSITO` 4, `TRANSFER` 5, `ANULA` 3. Si no coincide → `400 E302`. | 17–46 | confirmado |

### PING

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-P1 | `PING;<cualquiera>` → `200 {"pong":true}`. | 1–16 | confirmado |

### ALTA

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-A1 | `ALTA;<nombre>;<control>` → `201 {"cuentaId":"AC-000N"}`. El id es secuencial con 4 dígitos (`AC-%04d`). | 47–57 | confirmado |
| K-A2 | El nombre puede ser cualquier segmento no vacío (espacios, dígitos, acentos, guiones, largos). Duplicados crean cuentas nuevas. | 47–57 | confirmado |
| K-A3 | El contador de cuentas lo reinicia `__reset`; `PING` no lo consume. | 117–121 | confirmado |

### CONSULTA

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-C1 | `CONSULTA;<id>;<control>` existente → `200 {"cuenta_id":"<id>","saldo":N}`. | 58–64 | confirmado |
| K-C2 | Cuenta inexistente → `404 {"error":"E401","mensaje":"cuenta inexistente"}`. El id se compara exacto (sensible a mayúsculas; `ac-0001`, `AC-1` fallan). | 58–64 | confirmado |

### DEPOSITO

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-D1 | `DEPOSITO;<id>;<monto>;<control>` → `200 {"status":"recieved","operacionId":"OP-000N"}` (el typo *recieved* es intencional). | 65–86 | confirmado |
| K-D2 | Monto válido: `^[1-9][0-9]{0,9}$` (entero positivo, 1–10 dígitos, sin ceros a la izquierda). Cualquier otro valor (0, negativo, decimal, `+`, espacios, `1e3`, 11 dígitos) → `400 E303`. | 65–86, 279–290 | confirmado |
| K-D3 | Monto inválido se evalúa antes de la existencia de la cuenta. | 65–86 | confirmado |
| K-D4 | Cuenta inexistente → `404 E401`. Un depósito exitoso reinicia el contador de fallos de la cuenta. | 65–86, 240–278 | confirmado |

### TRANSFER

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-T1 | `TRANSFER;<origen>;<destino>;<monto>;<control>` → `200 {"status":"recieved","operacionId":"OP-000N"}`. | 87–100 | confirmado |
| K-T2 | Monto inválido → `400 E303` (igual que depósito). | 87–100 | confirmado |
| K-T3 | Origen = destino → `400 {"error":"E304","mensaje":"origen y destino iguales"}` (antes de límite/saldo). | 122–163 | confirmado |
| K-T4 | Origen o destino inexistente → `404 E401`. | 87–100 | confirmado |
| K-T5 | Monto > 100000 → `422 {"error":"E506","mensaje":"limite superado en el servicio"}`. | 87–100, 122–163 | confirmado |
| K-T6 | Monto > saldo → `422 {"error":"E507","mensaje":"saldo insuficiente"}`. `E506` tiene prioridad sobre `E507`. | 87–100, 122–163 | confirmado |
| K-T7 | Éxito: resta del origen, suma al destino, reinicia el contador de fallos del origen. | 87–100, 240–278 | confirmado |

### ANULA

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-N1 | `ANULA;<operacionId>;<control>` existente y no anulada → `200 {"ok":true,"anulada":"OP-000N"}` y **revierte** el efecto (depósito: resta; transferencia: devuelve al origen y quita del destino). | 101–116 | confirmado |
| K-N2 | Ya anulada → `200 {"ok":false,"motivo":"ya anulada"}`. | 101–116 | confirmado |
| K-N3 | Operación inexistente (o id con formato inválido) → `404 {"error":"E402","mensaje":"operación inexistente"}`. | 101–116, 240–278 | confirmado |
| K-N4 | Anular **no** desbloquea una cuenta bloqueada. | 240–278 | confirmado |

### Comando desconocido

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| K-U1 | → `400 {"error":"E301","mensaje":"comando desconocido "}` (con **espacio final**). | 291–308, 337–347 | confirmado |
| K-U2 | Si algún comando está a distancia de edición (Levenshtein, en mayúsculas) ≤ 2, añade `"sugerencia":"<COMANDO>"` al más cercano. Desempate ante dos comandos a igual distancia: indeterminado; el reemplazo elige el primero de `PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA`. | 291–308, 337–347 | confirmado el umbral; **supuesto** el desempate |

## 4 · Memoria entre requests

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| M-01 | El estado es por proceso y por token: cuentas, saldos, operaciones y contadores. | 117–121 | confirmado |
| M-02 | Contadores: `AC-%04d` y `OP-%04d` secuenciales; `__reset` los vuelve a 1 y borra el estado. | 117–121 | confirmado |
| M-03 | **Bloqueo por fraude (oculto):** cada cuenta lleva un contador de fallos de transferencia. `E506` y `E507` lo incrementan; una transferencia exitosa o un depósito lo reinician; `E303`, `E304` y `E401` no lo tocan. Con **3 fallos**, el siguiente intento de transferencia desde esa cuenta (como origen) → `409 {"error":"E510","mensaje":"cuenta bloqueada"}`, comprobado tras validar monto/igualdad/cuentas y antes del límite/saldo. `CONSULTA`, `DEPOSITO` y `ANULA` siguen permitidos; un depósito desbloquea. | 164–239, 240–278, 309–336 | confirmado |
| M-04 | `x-req` es un contador global que no reinicia `__reset`. | probe_xreq | confirmado |

## 5 · Errores

| ID | Status | Cuerpo exacto | Cuándo | Evidencia | Confianza |
| --- | --- | --- | --- | --- | --- |
| E001 | 401 | `{"error":"E001","mensaje":"no autorizado"}` | token ausente/incorrecto | pendiente #3 (observado en probe_recon, sin id) | probable |
| E100 | 400 | `{"error":"E100","mensaje":"json inválido"}` | JSON no parseable / cuerpo vacío | pendiente #3 (observado en probe_recon, sin id) | probable |
| E101 | 413 | `{"error":"E101","mensaje":"cuerpo demasiado grande"}` | cuerpo > 8191 bytes | pendiente #3 (borde medido, sin id) | probable |
| E102 | 400 | `{"error":"E102","mensaje":"falta m"}` | JSON sin `m` string | pendiente #3 (observado en probe_recon, sin id) | probable |
| E103 | 400 | `{"error":"E103","mensaje":"falta control"}` | mensaje sin `;` | 1–16 | confirmado |
| E104 | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | algún segmento vacío | 1–16 | confirmado |
| E201 | 400 | `{"error":"E201","mensaje":"control mal formado"}` | control no `^\d{1,2}$` | 1–16 | confirmado |
| E202 | 400 | `{"error":"E202","mensaje":"control inválido"}` | control con formato válido pero incorrecto | 1–16 | confirmado |
| E301 | 400 | `{"error":"E301","mensaje":"comando desconocido "}` (+`sugerencia`) | comando no reconocido | 291–308, 337–347 | confirmado |
| E302 | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | nº de segmentos incorrecto | 17–46 | confirmado |
| E303 | 400 | `{"error":"E303","mensaje":"monto inválido"}` | monto no válido | 65–86, 279–290 | confirmado |
| E304 | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | transferencia al mismo id | 122–163 | confirmado |
| E401 | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | cuenta no existe | 58–64, 87–100 | confirmado |
| E402 | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | operación no existe | 101–116, 240–278 | confirmado |
| E404 | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | ruta/método no definidos | pendiente #3 (observado en probe_recon, sin id) | probable |
| E506 | 422 | `{"error":"E506","mensaje":"limite superado en el servicio"}` | transferencia > 100000 | 87–100, 122–163 | confirmado |
| E507 | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | transferencia > saldo | 87–100, 122–163 | confirmado |
| E510 | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | cuenta con 3 fallos de transferencia | 164–239, 240–278, 309–336 | confirmado |

Precedencia observada: `E001` → `E100`/`E101`/`E102` → `E103` → `E104` →
`E201`/`E202` → `E301` → `E302` → `E303` → `E304` → `E401` → `E510` → `E506` → `E507`
(en `TRANSFER`), y `E402` en `ANULA`.

## 6 · Cambios durante el día

| ID | Comportamiento | Evidencia | Confianza |
| --- | --- | --- | --- |
| C-01 | `E510 "cuenta bloqueada"` no aparece en los 20 ejemplos de la mañana ni en el material; se descubrió por experimentación (secuencias `bloqueo`/`bloqueo4`). Comportamiento de estado preexistente, no el cambio anunciado (ver C-03). | 122–163, 164–278, 309–336 | confirmado |
| C-02 | Algoritmo de control sin cambios durante la sesión: los controles de los ejemplos siguen vigentes (verificado 15:36 UTC). | ejemplos 1–20 de `frontier-reto-2/pruebas/ejemplos.jsonl`, `data/pares_control.jsonl` | confirmado |
| C-03 | Cambio anunciado de las 15:30 BOG: pendiente de detectar con `scripts/vigilancia.py`; al detectarlo se registra en `BITACORA.md` §4 y se adapta el reemplazo. | — | pendiente (#9) |

## 7 · Riesgos

| ID | Riesgo | Cómo se cerraría | Evidencia | Confianza |
| --- | --- | --- | --- | --- |
| R-01 | El bloqueo por 3 fallos penaliza reintentos legítimos y puede dejar cuentas inutilizables. | Reemplazar por rate-limit/backoff explícito y errores idempotentes. | 164–278 | confirmado |
| R-02 | El control ISO 7064 sobre un conjunto de caracteres limitado (letras/dígitos) se puede falsificar trivialmente. | Usar firma criptográfica (HMAC) o TOTP por mensaje. | C-06, `data/pares_control.jsonl` | confirmado |
| R-03 | `ANULA` revierte saldos sin auditoría ni límites; permite "deshacer" transferencias. | Trazabilidad append-only y reversos como operación nueva. | 101–116 | confirmado |
| R-04 | Estado en memoria de un solo proceso: `__reset` global y pérdida al reiniciar. | Persistencia transaccional por token. | 117–121 | confirmado |
| R-05 | Contadores de id predecibles y sin control de concurrencia. | UUIDs/seq por token y transacciones. | 47–57, 117–121 | confirmado |
| R-06 | `x-req` global y `__reset` no lo reinicia: fuga de información de actividad. | Contador por token y reinicio coherente. | pendiente #3 (observado en probe_xreq, sin id) | probable |

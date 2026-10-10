# Reto 2 · Ingeniería inversa de la "Caja Negra"

Investigación completa del servicio `https://caja-negra-production-c64f.up.railway.app`
y **reemplazo funcional** que replica su comportamiento, errores y reglas de estado ocultas.

- Especificación reimplementable: [`SPEC.md`](SPEC.md)
- Bitácora (qué pasó y cómo reaccionar): [`BITACORA.md`](BITACORA.md)
- Log de experimentos (formato oficial): [`experimentos.jsonl`](experimentos.jsonl) — **366 líneas**
- Fotos de estado para detectar el incidente: [`logs/snapshots/`](logs/snapshots)
- Paquete ejecutable de entrega: [`../reemplazo/`](../reemplazo/README.md)
- Adaptador desplegable: [`../reemplazo/src/server.js`](../reemplazo/src/server.js)

---

## 1. Entorno y credenciales (`.env`)

| Variable | Para qué sirve |
| --- | --- |
| `URL_API_ENTRYPOINT` | URL base del servicio (la misma del original). |
| `TOKEN_CAJA_NEGRA` | **Token personal real** contra el original (`cn-p-...`). Es el que autentica. |
| `TOKEN_API_ENTRYPOINT` | Token del **equipo/entrypoint** (`ftr_...`). Es el que envía el evaluador a **nuestro reemplazo**, NO sirve contra el original. |

⚠️ El `.env` contiene tokens reales: está en `.gitignore`, no publicar.

---

## 2. Cómo reproducir

```bash
cd reto2-investigacion

python3 scripts/client.py                 # prueba de conexión y cliente canónico
# probe_recon.py / probe_xreq.py son históricos y dependen de /tmp/api.py.
# Para comandos reproducibles usar client.py, explorar.py y verificar.py.

python3 scripts/explorar.py               # suite completa (integridad/aridad/comandos/estado)
python3 scripts/bloqueo.py                # regla de bloqueo E510
python3 scripts/control.py "CONSULTA;AC-0001"   # calcula el control

python3 scripts/extraer_pares.py          # consolida (cuerpo, control)
python3 scripts/scan_control.py "SALDOS;A"      # fuerza bruta del control (histórico)

# Terminal 1: iniciar el reemplazo local (token ficticio)
TOKEN_API_ENTRYPOINT=local-test PORT=3111 npm --prefix ../reemplazo start
```

En otra terminal, desde `reto2-investigacion/`, con `requests` instalado mediante
`requirements.txt` en un entorno virtual:

```bash
python3 scripts/verificar.py --url http://localhost:3111 --token local-test \
    --file ../frontier-reto-2/pruebas/ejemplos.jsonl
```

---

## 3. Índice de scripts

### Cliente y control
| Script | Qué hace |
| --- | --- |
| `scripts/client.py` | Cliente HTTP canónico + logger `send_and_log` (formato oficial). Lee `.env`. Reintentos ante timeouts/429. |
| `scripts/control.py` | Implementa el dígito de control ISO 7064 MOD 97-10. |
| Función `client.enviar` | Envía un cuerpo calculando su control; no es un archivo independiente. |

### Descubrimiento / exploración
| Script | Qué hace |
| --- | --- |
| `scripts/probe_recon.py` | Auth (variantes), rutas, métodos, formas de body, rango del control. |
| `scripts/probe_xreq.py` | Mide `x-req` y si el control depende del estado. |
| `scripts/explorar.py` | Suite por secciones: `integridad`, `aridad`, `alta`, `consulta`, `deposito`, `transfer`, `anula`, `estado`, `bordes`. |
| `scripts/bloqueo.py`, `bloqueo_conteo.py`, `bloqueo_reset.py`, `bloqueo_precedencia.py` | Caracterización del bloqueo `E510`. |
| `scripts/prueba_diferencial.py` | Batería comparativa original vs reemplazo. |
| `scripts/vigilancia.py` | Ejecuta una batería fija, guarda `logs/snapshots/<UTC>.json` y avisa si algo cambió (detector del incidente). |
| `scripts/validar.py` | Validación end-to-end del reemplazo: 20 ejemplos + 34 control + 62 batería; escribe `logs/validacion.json`. |
| `scripts/verificar.py` | Replay de una secuencia (JSONL) contra un servicio; compara status y cuerpo. |

### Crack del control (histórico, hasta llegar a ISO 7064)
Los seis intentos offline están en `scripts/historico/`; los scripts de escaneo se
conservan en `scripts/`. Ver [índice y requisitos de scripts](scripts/README.md).

| Script | Qué probó |
| --- | --- |
| `historico/crack_basico.py` | sumas, XOR, djb2, sdbm, fnv, java, crc32, adler |
| `historico/crack_rolling.py` | hash polinómico `h=(h*b+c) mod M` |
| `historico/crack_hashfuncs.py` | CRC-8 (todos los polinomios) y otros |
| `historico/crack_afin.py` | modelos afines sobre features |
| `historico/crack_crc.py` | CRC-16, Fletcher, rotaciones |
| `historico/crack_tabla.py` | Tabla comparativa de candidatos |
| `historico/crack_control_bruteforce.py` | fuerza bruta de controles (histórico) |
| `extraer_pares.py` / `scan_control.py` | dataset `(cuerpo → control)` y escaneo |

### Datos
- `data/pares_control.jsonl` — 35 pares `(cuerpo, control)` (34 válidos + PING).
- `data/control_cache.json` — escaneos completos por cuerpo (controles únicos).
- `experimentos.jsonl` — 366 observaciones con hipótesis (evidencia de la spec).

---

## 4. Hallazgos

### 4.1 Autenticación y rutas
- `Authorization: Bearer <token>` obligatorio en **todas** las rutas (`/health`, `/__reset`, `/msg` y rutas inexistentes).
- Token ausente/incorrecto o esquema distinto (`bearer`) → `401 {"error":"E001","mensaje":"no autorizado"}`.
- `GET /health` → `200 {"ok":true}`. `POST /__reset` → `200 {"ok":true}`.
- Cualquier otra ruta/método → `404 {"error":"E404","mensaje":"ruta desconocida"}`. `HEAD /health` → 404 sin cuerpo.
- `Content-Type` se ignora. `x-req` es un contador global que `__reset` no reinicia.

### 4.2 El dígito de control (resuelto)
El control es **ISO 7064 MOD 97-10**, el verificador del IBAN:

1. Tomar el mensaje **sin su último campo**.
2. Concatenar: cada dígito vale su valor; cada letra su posición `A=1…Z=26` (sin importar mayúsculas); `;`, `-`, espacios y no-ASCII no aportan.
3. `control = 98 − (100·(N mod 97)) mod 97`, sin ceros a la izquierda.

Validado contra **34/34** pares propios (ver `data/pares_control.jsonl`). Ejemplo:
`CONSULTA;AC-0001` → `14`.

Matices exactos: `3` es válido; `03` → `E202`; `003`/`+3`/` 3`/`3abc` → `E201`. `PING` ignora el control.

> Nota de método: el crack se orientó tras hallar en un repo público (`rominapitronello/frontier-bog26-caja-negra`) una hipótesis del algoritmo; **se validó de forma independiente contra nuestro propio dataset** de 34 pares y con el reemplazo (20/20 ejemplos).

### 4.3 Protocolo de mensajes
`COMANDO;arg1;...;control`, separado por `;`. Errores de parsing con prioridad:
`E001 → E100/E101/E102 → E103 (falta control) → E104 (segmento vacío) → E201/E202 (control) → E301 (desconocido) → E302 (aridad) → negocio`.

### 4.4 Comandos
| Comando | Aridad | Éxito |
| --- | --- | --- |
| `PING` | 2 | `200 {"pong":true}` (ignora control) |
| `ALTA;<nombre>` | 3 | `201 {"cuentaId":"AC-000N"}` (secuencial, `%04d`) |
| `CONSULTA;<id>` | 3 | `200 {"cuenta_id":"<id>","saldo":N}` |
| `DEPOSITO;<id>;<monto>` | 4 | `200 {"status":"recieved","operacionId":"OP-000N"}` |
| `TRANSFER;<id>;<id>;<monto>` | 5 | `200 {"status":"recieved","operacionId":"OP-000N"}` |
| `ANULA;<opId>` | 3 | `200 {"ok":true,"anulada":"OP-000N"}` (revierte saldos) |

- Monto válido: `^[1-9][0-9]{0,9}$` (entero, 1–10 dígitos, sin ceros a la izquierda) → si no, `E303`.
- `TRANSFER`: límite de **100000** (`E506`); saldo insuficiente (`E507`); mismo origen/destino (`E304`); `E506` antes que `E507`.
- Comando desconocido: `E301 "comando desconocido "` (espacio final) + `sugerencia` si Levenshtein ≤ 2.

### 4.5 🕵️ Comportamiento oculto: `E510` cuenta bloqueada
**No está en los ejemplos ni en el material.** Se descubrió por experimentación:

- Cada cuenta acumula **fallos de transferencia**: `E506` y `E507` suman; `E303`, `E304`, `E401` no.
- Al llegar a **3 fallos**, la siguiente transferencia **desde esa cuenta como origen** → `409 {"error":"E510","mensaje":"cuenta bloqueada"}`.
- Se comprueba tras monto/igualdad/cuentas y **antes** del límite/saldo.
- Un **depósito** o una transferencia exitosa reinician el contador; un depósito **desbloquea**.
- `CONSULTA`, `DEPOSITO` y `ANULA` siguen funcionando con la cuenta bloqueada; `ANULA` **no** desbloquea.
- `__reset` limpia el bloqueo.

### 4.6 Stack / fingerprint (¿qué lenguaje y framework?)

El borde es **Railway** (proxy Hikari sobre **Pingora**, Rust); la app queda oculta tras él.
Por comportamiento, el servicio es **un HTTP mínimo hecho a mano**, lo más consistente con
**Node.js (JS/TS) sobre el módulo `http`** (confianza media-alta):

- `Transfer-Encoding: chunked` **sin** `Content-Length`, `X-Powered-By` ausente.
- Método incorrecto → **404** (no 405) y `HEAD /health` → 404 (sin auto-HEAD).
- JSON compacto con UTF-8 crudo, parser tolerante a `Content-Type`/UTF-8 inválido, BOM no ignorado.
- Errores y límite de cuerpo propios (`E100–E104`, 8192 bytes), sin compresión ni CORS.

Descartados: Express/Nest (Ping `X-Powered-By`), Fastify/Go/Rust (suelen fijar `Content-Length`),
Flask/FastAPI/Starlette/Spring Boot (405 en método incorrecto). Detalle y evidencia en
[`logs/fingerprint.md`](logs/fingerprint.md).

### 4.7 Otros bordes
- Cuerpo máximo: 8191 bytes (`413 E101`).
- JSON válido sin `m` string → `E102`; JSON inválido → `E100`.
- Contadores de cuenta/operación secuenciales, reiniciados por `__reset`; `PING` no los consume.

---

## 5. Reemplazo

El paquete `../reemplazo/` implementa las reglas observadas sin dependencias npm de producción (Node ≥ 18):
autenticación, rutas, ISO 7064, aridad, montos, límite, bloqueo, reversos y errores exactos.

```bash
cd ../reemplazo
npm test                              # 21 pruebas de dominio + smoke HTTP local
# Configurar TOKEN_API_ENTRYPOINT por un canal privado:
PORT=3000 npm start
# o Docker
docker build -t caja-negra-jemela . && docker run -p 3000:3000 -e TOKEN_API_ENTRYPOINT=... caja-negra-jemela
```

Estructura (seam ligero, sin capas de más):

| Archivo | Responsabilidad |
| --- | --- |
| `src/domain.js` | **Dominio puro**: control ISO 7064, parsing, máquina de estados, errores y bloqueo. Sin HTTP ni E/S. |
| `src/server.js` | **Adaptador HTTP**: auth, rutas, límite de cuerpo, JSON y `x-req`. |
| `test/domain.test.js` | Pruebas del dominio, en proceso (rápidas y deterministas). |
| `test/http.test.js` | Smoke HTTP local con token ficticio y verificación de reset. |

**¿Por qué no hexagonal completo?** Hexagonal (puertos/adaptadores, repositorios, inyección)
se justifica con múltiples adaptadores (HTTP + WS + CLI), múltiples persistencias o
multi-instancia. El reto pide **un proceso, HTTP y estado en memoria**: añadir esas capas
sería ceremonia sin retorno. En cambio, el seam dominio/adaptador cuesta casi nada y da
lo valioso de hexagonal: test unitario, estado inyectable para `__reset` y reutilización
en la prueba diferencial sin red.

El token se lee de `TOKEN_API_ENTRYPOINT`/`TEAM_TOKEN` (o del `.env` local). Con otro
token o sin token responde `E001` como el original.

### Estado de pruebas
| Prueba | Resultado |
| --- | --- |
| `verificar.py` vs 20 ejemplos oficiales (reemplazo) | **20/20** |
| `validar.py` (ejemplos + control + batería) | **116/116** |
| `npm test` (dominio puro) | **21/21** |
| `prueba_diferencial.py` original vs reemplazo | **75/78** coincidencias* |
| `control.py` vs 34 pares propios | **34/34** |

\* Las 3 diferencias son artefactos: al reintentar por timeouts de la original, el
reemplazo no duplica la operación y la original sí, desincronizando contadores/saldos.
No son discrepancias de lógica.

---

## 6. Preguntas abiertas / supuestos

- `E510`: ¿la transferencia exitosa también reinicia el contador del **destino**? (el reemplazo solo reinicia el origen; **supuesto**).
- Empate en la `sugerencia` (dos comandos a la misma distancia): orden de desempate no determinado.
- ¿Existen códigos `E305`, `E403`, `E508`/`E509`? No se lograron disparar.
- El bloqueo y el mínimo de caracteres no aparecen en el material: tratarlos como
  comportamiento observado, no como contrato público (ver riesgos en `SPEC.md`).

---

## 7. Estructura

```
reto2-investigacion/
├── README.md            # informe de hallazgos
├── SPEC.md              # especificación oficial
├── BITACORA.md          # qué pasó y cómo reaccionar
├── experimentos.jsonl   # 366 observaciones (evidencia)
├── data/                # dataset de controles
├── logs/                # fingerprint + snapshots para detectar cambios
├── scripts/             # herramientas activas y legacy; ver scripts/README.md
│   └── historico/       # seis intentos offline anteriores del control
└── requirements.txt     # requests para herramientas Python
```

El runtime está separado en la raíz:

```text
reemplazo/
├── src/                 # domain.js + server.js
├── test/                # domain.test.js + http.test.js
├── README.md            # configuración y despliegue
├── package.json
├── Dockerfile
├── .dockerignore
└── .env.example
```

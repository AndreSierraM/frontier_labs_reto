# Fingerprint · ¿Qué lenguaje/framework corre el original?

Fecha de sondas: 2026-10-10 ~15:44 UTC. Servicio: `caja-negra-production-c64f.up.railway.app`.

## 1 · Capa de borde (NO es la aplicación)

Todas las respuestas traen cabeceras de **Railway**:

```
Server: railway-hikari
x-railway-request-id: <id>
x-hikari-trace: mia1.xxxx
x-railway-edge: mia1
```

Peticiones HTTP crudas malformadas o con `Host` incorrecto las responde el borde,
no la app:

```
HTTP/1.1 400 Bad Request
Server: Pingora
Content-Length: 0
Connection: close
```

o, sin enrutar: `{"status":"error","code":404,"message":"Application not found","x-railway-fallback":true}`.

**Conclusión:** el borde es Railway (proxy **Hikari**, implementado sobre **Pingora**, Rust).
Esto oculta el runtime real, así que el fingerprint de la app es indirecto.

## 2 · Evidencia de la aplicación

| # | Observación | Implica |
| --- | --- | --- |
| F1 | `Transfer-Encoding: chunked` y **sin** `Content-Length`, incluso en respuestas de 20–100 bytes. | El servidor no fija longitud: típico de Node `http` con `res.end()`, o de un runtime que no calcula longitud. Los frameworks habituales sí envían `Content-Length`. |
| F2 | **Sin** cabecera `X-Powered-By`. | No es Express/NestJS por defecto (la añaden). |
| F3 | Método incorrecto sobre ruta existente (`GET /__reset`, `POST /health`) → **404** `E404`, no 405. | Routers que no devuelven `405 Method Not Allowed` (Express, koa-router, router propio). Flask/FastAPI/Spring devuelven 405. |
| F4 | `HEAD /health` → **404** (no 200). | El servidor **no** auto-responde HEAD por cada GET. Go `net/http` (patrón `GET`) y Flask sí lo harían; Express/Starlette/Fastify no. |
| F5 | Rutas estrictas: `/msg/` y `/msg%2F` → 404; `/msg?x=1` y `/./msg` → 200; nombres de ruta sensibles a mayúsculas. | Router propio o framework en modo estricto. |
| F6 | JSON **compacto** (sin espacios) y **UTF-8 crudo** (`límite` = `c3 a1`), orden de claves estable. | `JSON.stringify` (Node), `serde_json` (Rust), `encoding/json` (Go)… pero **no** `json.dumps` de Python por defecto (escapa `\u00ed` y pone espacios). |
| F7 | Cuerpo JSON parseado **ignorando `Content-Type`** (`text/plain` también funciona) y con reemplazo de bytes UTF-8 inválidos (terminó en `E103`, no en error de parseo). | Se lee el cuerpo crudo y se parsea con un parser tolerante al UTF-8 (Node `Buffer.toString` + `JSON.parse`, Go `json.Unmarshal`). |
| F8 | **BOM** al inicio → `E100 json inválido`. | No se hace *strip* de BOM (comportamiento por defecto de `JSON.parse`). |
| F9 | Errores **propios** `E100/E101/E102/E103/E104` y límite de cuerpo propio en 8192 bytes. | Manejo de errores y de tamaño hecho a mano, no del framework. |
| F10 | **Sin compresión** aunque se pida `Accept-Encoding: gzip, deflate, br`. | No hay middleware de compresión. |
| F11 | **Sin CORS** (`OPTIONS` → 404, sin `Access-Control-Allow-*`). | No hay middleware CORS. |
| F12 | Prefijos de token de plataforma: `ftr_` (Frontier) y `cn-p_`/`cn-p-` (caja negra personal). | Autoría de la plataforma del reto, no del framework. |

## 3 · Conclusiones

**Probable (confianza media-alta):** es un **servicio HTTP mínimo y hecho a mano**,
lo más consistente con **Node.js (JavaScript/TypeScript)** usando el módulo nativo
`http` (o un micro-framework sin Content-Length automático) y un router propio.
Encajan F1, F2, F3, F4, F6, F7, F8, F9, F10, F11.

**Alternativas aún posibles:** Go con `net/http` y mux propio (encaja F3/F4/F6/F7/F9,
pero Go suele añadir `Content-Length` a respuestas pequeñas → choca con F1); Rust
(axum/hyper) también añade `Content-Length`.

**Descartados con razonable seguridad:**
- **Express** / **NestJS** / **Fastify**: `X-Powered-By` (Express/Nest) y `Content-Length` (Fastify).
- **Flask** / **FastAPI** / **Starlette**: 405 en método incorrecto y auto-HEAD (Flask).
- **Spring Boot** (Java): 405 en método incorrecto; mensajes de error con formato Spring.
- **aiohttp**: auto-HEAD y `Content-Length`.
- **PHP/Laravel**: escaparía Unicode y devolvería 405.

**No determinable con certeza:** el borde de Railway (Pingora/Hikari) puede normalizar
cabeceras (p. ej. forzar `chunked`), por lo que F1 es evidencia fuerte pero no concluyente.
Para confirmarlo habría que observar la app sin el proxy.

## 4 · Cómo reproducir las sondas

```bash
T=$(grep TOKEN_CAJA_NEGRA ../.env | cut -d= -f2 | xargs)
B=https://caja-negra-production-c64f.up.railway.app
curl -s --http1.1 -i "$B/health" -H "Authorization: Bearer $T"
curl -s --http1.1 -i -X POST "$B/msg" -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -H 'Accept-Encoding: gzip' -d '{"m":"PING;64"}'
curl -s -i -X OPTIONS "$B/msg" -H "Origin: http://x"
```

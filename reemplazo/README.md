# Reemplazo · Reto 2: La caja negra

**Este directorio es el paquete ejecutable de entrega.** Replica la API observada sin consultar el original ni otro reemplazo. La investigación y sus credenciales no forman parte del runtime.

## Estructura

```text
src/domain.js        Máquina de estados, control, guardas y respuestas
src/server.js        Adapter HTTP, auth, body; exporta createHandler(storage)
src/storage.js       Estado: memoria (local/tests) o PostgreSQL de una fila (Neon)
test/domain.test.js  21 pruebas del dominio, sin red
test/http.test.js    Smoke HTTP con servidor local y token ficticio
package.json        Entrypoint y comandos
Dockerfile          Imagen con sólo src/ y package.json
.env.example        Configuración sin secretos
.dockerignore       Lista permitida de archivos para la imagen
```

JavaScript/CommonJS, Node ≥18. El paquete del reemplazo no tiene dependencias de
producción; la composición desplegada en Vercel usa `pg` (raíz del repo) para
PostgreSQL. Docker conserva Node 20.

## Arranque local

Desde este directorio:

```bash
TOKEN_API_ENTRYPOINT=local-test PORT=3111 npm start
```

`local-test` es un token ficticio. Para producción configurar el token real del equipo por un canal seguro, no incluirlo en comandos publicados ni en el repositorio.

También se puede copiar `.env.example` a `.env` aquí y completar el token. Prioridad: variables del proceso → archivo indicado por `ENV_FILE` → `.env` de este paquete → `.env` de la raíz del repo (compatibilidad con el desarrollo existente).

| Variable | Uso |
|---|---|
| `TOKEN_API_ENTRYPOINT` | Token del equipo; `TEAM_TOKEN` es el alias existente. |
| `PORT` | Puerto HTTP; 3000 por defecto. |
| `ENV_FILE` | Archivo de configuración opcional. |

No requiere `TOKEN_CAJA_NEGRA` ni URL del original. Si no hay token configurado, las llamadas responden no autorizado.

## Tests

```bash
npm test
```

Ejecuta las pruebas de dominio y un smoke HTTP local con timeout de cinco segundos por llamada. No consulta el original, no necesita tokens reales y no escribe logs de investigación.

Para validar los ejemplos y la batería completa, desde la raíz del repo y con el servicio arrancado en `:3111`:

```bash
python3 reto2-investigacion/scripts/validar.py \
  --url http://localhost:3111 --token local-test
```

Las dependencias de ese verificador están en `reto2-investigacion/requirements.txt`. Es una herramienta de desarrollo, no una dependencia del paquete entregado.

## Persistencia

El mismo dominio corre con dos adaptadores (`src/storage.js`):

- **Memoria**: local y tests (`createMemoryStorage`).
- **PostgreSQL / Neon**: el despliegue (`createPostgresStorage`). Una fila JSONB
  con transacciones (`SELECT ... FOR UPDATE`) que serializa las escrituras y
  sobrevive a reinicios e instancias serverless.

## Despliegue

- **Producción (Vercel):** `api/index.js` es el entrypoint serverless; usa el
  `pg.Pool` con `DATABASE_URL` de Neon. Alias estable:
  `https://frontier-labs-reto.vercel.app`.
- **Docker** (alternativa local):
  ```bash
  docker build -t caja-negra-reemplazo reemplazo
  docker run --rm -p 3000:3000 -e TOKEN_API_ENTRYPOINT caja-negra-reemplazo
  ```
  La imagen copia `package.json` y `src/`, ejecuta como usuario `node` y arranca
  `node src/server.js` (estado en memoria).

Configurar el token del equipo y `DATABASE_URL` por el canal privado; no
incluirlos en el repositorio. El servicio debe permanecer disponible desde las
20:00 hasta terminar el demo day.

## Contrato y límites

- Autenticación bearer exacta en todas las rutas.
- `GET /health`: 200 cuando listo.
- `POST /msg`: mensajes JSON con `m` string; status/body compatibles.
- `POST /__reset`: restaura cuentas, operaciones, fallos e IDs.
- Métodos/rutas desconocidos y entradas inválidas conservan los errores heredados.
- En local el estado es por proceso (reinicio pierde datos); en el despliegue
  vive en PostgreSQL y lo comparten las instancias.
- Algunos errores cambian estado: E506/E507 incrementan fallos; no tratarlos como operaciones sin efecto.

La spec y el log se entregan por separado: [SPEC](../reto2-investigacion/SPEC.md), [experimentos](../reto2-investigacion/experimentos.jsonl). Diseño/diagrama: [entregables](../public/entregas/). No afirmar equivalencia completa hasta validar el entrypoint con la evaluación oficial.

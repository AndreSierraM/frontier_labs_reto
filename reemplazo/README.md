# Reemplazo · Reto 2: La caja negra

**Este directorio es el paquete ejecutable de entrega.** Replica la API observada sin consultar el original ni otro reemplazo. La investigación y sus credenciales no forman parte del runtime.

## Estructura

```text
src/domain.js        Máquina de estados, control, guardas y respuestas
src/server.js        Adapter HTTP, auth, body y estado del proceso
test/domain.test.js  21 pruebas del dominio, sin red
test/http.test.js    Smoke HTTP con servidor local y token ficticio
package.json        Entrypoint y comandos
Dockerfile          Imagen con sólo src/ y package.json
.env.example        Configuración sin secretos
.dockerignore       Lista permitida de archivos para la imagen
```

JavaScript/CommonJS, Node ≥18, sin dependencias npm de producción. Docker conserva Node 20; SQLite/Node 24 son propuestas documentadas, no capacidades implementadas.

## Arranque local

Desde este directorio:

```bash
TOKEN_API_ENTRYPOINT=local-test PORT=3000 npm start
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

Para validar los ejemplos y la batería completa, desde la raíz del repo y con el servicio arrancado en `:3000`:

```bash
python3 reto2-investigacion/scripts/validar.py \
  --url http://localhost:3000 --token local-test
```

Las dependencias de ese verificador están en `reto2-investigacion/requirements.txt`. Es una herramienta de desarrollo, no una dependencia del paquete entregado.

## Docker / despliegue

Desde la raíz del repo:

```bash
docker build -t caja-negra-reemplazo reemplazo
# Exportar TOKEN_API_ENTRYPOINT por el canal privado de configuración:
docker run --rm -p 3000:3000 -e TOKEN_API_ENTRYPOINT caja-negra-reemplazo
```

La imagen copia únicamente `package.json` y `src/`, ejecuta como usuario `node` y arranca `node src/server.js`. No incluye `.env`, tests, scripts, snapshots ni material del original.

En el hosting, elegir **`reemplazo/` como directorio raíz/contexto de build**, configurar el token, el puerto proporcionado por la plataforma y **una sola instancia**. Registrar la URL base pública como entrypoint. El servicio debe permanecer disponible desde las 20:00 hasta terminar demo day.

## Contrato y límites

- Autenticación bearer exacta en todas las rutas.
- `GET /health`: 200 cuando listo.
- `POST /msg`: mensajes JSON con `m` string; status/body compatibles.
- `POST /__reset`: restaura cuentas, operaciones, fallos e IDs.
- Métodos/rutas desconocidos y entradas inválidas conservan los errores heredados.
- Estado en memoria: reinicio pierde datos y varias réplicas no comparten estado.
- Algunos errores cambian estado: E506/E507 incrementan fallos; no tratarlos como operaciones sin efecto.

La spec y el log se entregan por separado: [SPEC](../reto2-investigacion/SPEC.md), [experimentos](../reto2-investigacion/experimentos.jsonl). Diseño/diagrama: [entregables](../docs/entregables/). No afirmar equivalencia completa hasta validar el entrypoint con la evaluación oficial; SQLite sigue pendiente.

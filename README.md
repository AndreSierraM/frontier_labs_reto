# Frontier Labs · Reto 2: La caja negra

Reemplazo HTTP compatible, modelado como **máquina de estados extendida**: mensajes, guardas y efectos sobre cuentas, saldos, operaciones y bloqueos.

El repositorio documenta el protocolo y el diseño del servicio y conserva la implementación que lo materializa. El runtime no consulta al original ni a otro reemplazo.

## Dónde está cada cosa

```text
frontier-reto-2/                  Material oficial, sin modificar
  README.md                      Contrato y reglas del reto
  pruebas/ejemplos.jsonl          20 ejemplos ordenados
reemplazo/                       Paquete ejecutable de entrega
  src/                           Adapter HTTP y máquina de estados
  test/                          Pruebas de dominio y HTTP local
  README.md                      Arranque, configuración y despliegue
  Dockerfile                     Imagen del reemplazo, sin investigación
reto2-investigacion/              Trabajo técnico y evidencia
  scripts/                       Clientes, exploración y validación
    historico/                   Intentos antiguos del control
  data/                          Pares y cachés de control
  logs/                          Fingerprint y snapshots
  SPEC.md                        Spec de comportamiento con referencias
  BITACORA.md                    Cronología e incidente
  experimentos.jsonl             Evidencia original; no reordenar IDs
  .env.example                   Variables de entorno sin secretos
  requirements.txt               Dependencia de los scripts Python
docs/                            Documentación y entregables
  01-diseno.md                    Decisiones y máquina de estados
  02-arquitectura.md              Arquitectura y transiciones
  entregables/                   Los dos HTML de Systems Design
  plantillas/                    Ejecución, evaluación, demo y debrief
  archivo/mapa-inicial/           Snapshot anterior, no estado actual
```

El runtime vive en `reemplazo/`, separado de investigación. Los scripts activos conservan su ruta. Las rutas antiguas `reto2-investigacion/reemplazo/` ya no son el entrypoint.

## Ejecutar y probar localmente

Requisitos: Node ≥18 para el runtime actual; Python 3 y `requests` para los scripts. Docker usa Node 20. El objetivo Node 24/SQLite pertenece al diseño futuro, no a esta instalación.

### 1. Tests de dominio y smoke HTTP local

Desde la raíz:

```bash
npm --prefix reemplazo test
```

### 2. Arrancar el reemplazo

En una terminal:

```bash
TOKEN_API_ENTRYPOINT=local-test PORT=3111 npm --prefix reemplazo start
```

`local-test` es un token ficticio exclusivamente para desarrollo, no el token del equipo.

### 3. Reproducir los ejemplos

En otra terminal, desde la raíz:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r reto2-investigacion/requirements.txt
.venv/bin/python reto2-investigacion/scripts/verificar.py \
  --url http://localhost:3111 --token local-test \
  --file frontier-reto-2/pruebas/ejemplos.jsonl
```

Este comando llama al reemplazo local y hace reset antes de la secuencia. No ejecuta experimentos contra el original.

### 4. Validación completa (reproducible)

Con el reemplazo aún en `:3111`:

```bash
.venv/bin/python reto2-investigacion/scripts/validar.py \
  --url http://localhost:3111 --token local-test
```

Corre 20 ejemplos + 34 pares de control + 62 pasos de batería (**116/116**) y escribe `reto2-investigacion/logs/validacion.json`.

### Docker

```bash
docker build -t caja-negra-reemplazo reemplazo
# Exportar TOKEN_API_ENTRYPOINT por un canal seguro antes de ejecutar:
docker run --rm -p 3000:3000 -e TOKEN_API_ENTRYPOINT caja-negra-reemplazo
```

## Documentación vigente

| Necesidad | Fuente |
|---|---|
| Paquete ejecutable / despliegue | [Reemplazo](reemplazo/README.md) |
| Contrato oficial | [Material del reto](frontier-reto-2/README.md) |
| Diseño para entregar | [HTML](docs/entregables/01-diseno-sistemas.html) · [PDF](docs/entregables/01-diseno-sistemas.pdf) |
| Diagrama para entregar | [HTML](docs/entregables/02-diagrama-arquitectura.html) · [PDF](docs/entregables/02-diagrama-arquitectura.pdf) |
| Decisiones completas | [Diseño](docs/01-diseno.md), [arquitectura](docs/02-arquitectura.md) |
| Comportamiento observado | [SPEC](reto2-investigacion/SPEC.md) y [log](reto2-investigacion/experimentos.jsonl) |
| Hallazgos y resultados reportados | [Investigación](reto2-investigacion/README.md) |
| Incidente y cronología | [Bitácora](reto2-investigacion/BITACORA.md) |
| Preparación de las otras entregas | [Plantillas](docs/plantillas/README.md) |
| Navegación documental | [Índice de docs](docs/README.md) |

## Estado y límites

- Validación local reproducible ([logs/validacion.json](reto2-investigacion/logs/validacion.json)): 20/20 ejemplos + 34/34 control + 62/62 batería (**116/116**) y 21/21 unitarias. Los resultados no acreditan el set oculto ni SQLite.
- El evaluador usa 100 tests, reset antes de cada test y máximo 5 segundos por paso; compara status y cuerpo.
- E506/E507 modifican el contador de fallos aunque sean respuestas 422. ANULA revierte una operación una vez; depósito desbloquea la cuenta.
- Algunas secuencias del log contienen resets implícitos: no reproducir todo agrupando únicamente por `seq`.
- Riesgos de diseño heredado: el bloqueo por 3 fallos penaliza reintentos, el control sobre letras/dígitos es falsificable, `ANULA` revierte sin auditoría y los IDs son predecibles.

## Secretos y evidencia

Para el reemplazo, usar [reemplazo/.env.example](reemplazo/.env.example) como `reemplazo/.env`; para investigación, la [plantilla de entorno](reto2-investigacion/.env.example) como `.env` en la raíz. Completar por canal privado. El token personal del original y el del reemplazo son distintos. No publicar `.env`, tokens, DB locales ni capturas crudas con credenciales.

Los scripts de exploración/vigilancia pueden consultar el original y modificar su estado: no ejecutarlos como parte de un smoke local. No reordenar, borrar ni convertir caches en evidencia experimental. El mapa de `docs/archivo/` es histórico y no describe el runtime actual.

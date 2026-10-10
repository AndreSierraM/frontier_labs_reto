# Stack

## Runtime summary

| Área | Estado | Evidencia |
|---|---|---|
| Lenguaje y runtime | [TODO] No hay implementación ni manifiesto. | `docs/codebase/.codebase-scan.txt` |
| Gestor de paquetes | [TODO] | `docs/codebase/.codebase-scan.txt` |
| Build o módulos | [TODO] | `docs/codebase/.codebase-scan.txt` |

## Dependencias de producción

No existen dependencias declaradas todavía. El reemplazo aún no tiene código.

## Toolchain y comandos

No hay comandos de instalación, build, test, lint ni configuración de formateo verificables.

## Configuración y restricciones de runtime

- El futuro servicio debe aceptar HTTP con bearer token, exponer `GET /health`, `POST /__reset` y replicar `POST /msg` y rutas desconocidas según el original.
- El evaluador compara status y body; cada paso tiene un límite de cinco segundos.
- [ASK USER] Elegir runtime, framework y hosting antes de implementar.

## Evidencia

- `docs/codebase/.codebase-scan.txt`
- `frontier-reto-2/README.md`
- `docs/03-ejecucion.md`

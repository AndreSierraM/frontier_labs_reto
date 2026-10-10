# Convenciones

## Estado

No hay código, linter, formatter ni tests configurados; por ello no hay convenciones de lenguaje verificables.

## Convenciones documentales existentes

| Elemento | Regla | Ejemplo | Evidencia |
|---|---|---|---|
| Documentos de entrega | Prefijo numérico de dos dígitos y kebab-case. | `docs/08-spec-reto-2.md` | `docs/` |
| Pendientes | Marcar explícitamente lo desconocido. | `[PENDIENTE]` | `README.md` |
| Hipótesis | No presentarlas como hechos. | `[SUPUESTO]` | `README.md` |
| Evidencia de descubrimiento | Una línea JSON por request al original, con `id` único. | `experimentos.jsonl` | `frontier-reto-2/README.md` |

## Reglas que deberá adoptar el código

- [TODO] Elegir formato, linter y convención de archivos junto con el runtime.
- Preservar status y body del original; no normalizar errores sin evidencia.
- No registrar tokens en repositorio, video ni logs públicos.

## Errores, logs y tests

- La spec debe clasificar cada comportamiento como confirmado, probable o supuesto y citar IDs del log oficial.
- Las regresiones deben ejecutarse contra el reemplazo; el comparador diferencial al original sólo pertenece a desarrollo.
- [TODO] Definir ubicación y comandos de pruebas cuando exista implementación.

## Evidencia

- `README.md`
- `frontier-reto-2/README.md`
- `docs/08-spec-reto-2.md`
- `docs/09-experimentos.md`

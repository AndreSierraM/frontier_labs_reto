# Estructura

## Mapa superior

| Ruta | Propósito verificable | Evidencia |
|---|---|---|
| `README.md` | Índice y estado de los entregables del reto. | `README.md` |
| `docs/` | Diseño, plan de ejecución, evaluación, spec y descubrimiento. | `docs/*.md` |
| `frontier-reto-2/README.md` | Material oficial del Reto 2. | `frontier-reto-2/README.md` |
| `frontier-reto-2/pruebas/ejemplos.jsonl` | Veinte ejemplos ordenados desde estado inicial. | `frontier-reto-2/pruebas/ejemplos.jsonl` |
| `docs/codebase/` | Este mapa del repositorio. | `docs/codebase/*.md` |

## Entry points

- Runtime principal: [TODO] No existe implementación.
- Entradas documentales: `README.md` para navegación y `frontier-reto-2/README.md` como contrato oficial.

## Límites de módulos previstos

| Límite | Debe contener | No debe contener |
|---|---|---|
| Descubrimiento | Scripts propios, log de experimentos y regresiones. | Llamadas del servicio desplegado al original. |
| Servicio | Transporte HTTP, validación, reglas y estado inferido. | Dependencia runtime del original u otro reemplazo. |
| Documentación | Hechos con evidencia y supuestos claramente marcados. | Resultados inventados. |

## Organización

- La documentación usa prefijo numérico (`01-…` a `09-…`) para ordenar el flujo de entrega.
- No hay convención de nombres para código, imports ni alias aún.

## Evidencia

- `docs/codebase/.codebase-scan.txt`
- `README.md`
- `frontier-reto-2/README.md`

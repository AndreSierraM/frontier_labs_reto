# Testing

## Stack y comandos

No existe framework, comando ni configuración de test porque no hay implementación.

## Evidencia y cobertura disponible

- `frontier-reto-2/pruebas/ejemplos.jsonl` contiene 20 observaciones del original en una sola secuencia; sirve como baseline, no como prueba exhaustiva.
- La evaluación oficial usa 100 tests: 40 individuales, 45 secuencias de 2–5 pasos y 15 de 6–12; cada uno comienza con reset.
- El set oculto no repite la secuencia de ejemplos.

## Estrategia prevista

| Alcance | Estado | Objetivo |
|---|---|---|
| Regresión de ejemplos | [TODO] | Reproducir la secuencia conocida desde reset. |
| Pruebas de reglas | [TODO] | Cubrir entradas, comandos, errores y precedencia confirmados. |
| Secuencias reservadas | [TODO] | Validar generalización sin usarlas para inferir reglas. |
| Smoke público | [TODO] | Health, auth, reset, rutas desconocidas y disponibilidad. |

Cada experimento al original debe quedar en `experimentos.jsonl` con hipótesis, status y respuesta. No debe crearse evidencia retrospectiva a partir de los ejemplos.

## Aislamiento y calidad

- Reiniciar el original y el reemplazo con sus propios mecanismos autorizados antes de comparar.
- No contar como coincidencia una comparación sin estado inicial conocido o sin respuesta del original.
- [TODO] Elegir runner, convenciones de archivos y umbral de cobertura al implementar.

## Evidencia

- `frontier-reto-2/README.md`
- `frontier-reto-2/pruebas/ejemplos.jsonl`
- `docs/04-evaluaciones.md`
- `docs/09-experimentos.md`

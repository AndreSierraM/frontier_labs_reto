# Arquitectura

## Estilo actual y objetivo

No hay arquitectura implementada. El diseño documentado propone dos flujos separados: descubrimiento controlado contra el original y un reemplazo HTTP independiente. La separación es obligatoria porque el reemplazo no puede llamar al original ni a otro reemplazo.

Restricciones que definen el diseño:

1. El evaluador reinicia el servicio antes de cada test y compara exactamente status y body.
2. El servicio puede tener estado dentro de secuencias de dos a doce requests.
3. El reemplazo debe mantenerse disponible desde las 20:00 hasta el demo day.

## Flujo previsto

```text
script propio -> original -> log de experimentos -> spec/regresiones
cliente/evaluador -> HTTP + auth -> reglas inferidas + estado -> status y body compatibles
```

1. Un script propio ejecuta una hipótesis desde estado reiniciado y registra cada request al original.
2. La evidencia se transforma en comportamientos con confianza explícita y casos de regresión.
3. El servicio recibe la petición del evaluador y reproduce la validación y la transición de estado inferidas.
4. `POST /__reset` devuelve el estado local inicial; `GET /health` responde 200 cuando esté listo.
5. Ninguna ruta de producción consulta el original.

## Responsabilidades previstas

| Módulo | Responsabilidad | No debe asumir | Evidencia |
|---|---|---|---|
| Transporte HTTP | Rutas, auth, parsing y respuestas fieles. | Errores automáticos del framework compatibles. | `frontier-reto-2/README.md` |
| Dominio inferido | Comandos, validación, precedencia y transiciones. | Reglas no observadas como confirmadas. | `frontier-reto-2/pruebas/ejemplos.jsonl` |
| Estado | Cuentas, operaciones y reinicio, si los experimentos lo confirman. | Persistencia entre procesos. | `frontier-reto-2/README.md` |
| Descubrimiento | Experimentos, log y comparación diferencial. | Uso desde el runtime desplegado. | `docs/09-experimentos.md` |

## Riesgos

- Los veinte ejemplos sólo cubren una secuencia y no prueban reglas generales ni auth/rutas/reset.
- Un framework puede cambiar cuerpos o precedencia de errores antes de que llegue a la lógica propia.
- [ASK USER] Confirmar si se prefiere una plataforma de proceso único para preservar estado local.

## Evidencia

- `docs/02-arquitectura.md`
- `frontier-reto-2/README.md`
- `frontier-reto-2/pruebas/ejemplos.jsonl`

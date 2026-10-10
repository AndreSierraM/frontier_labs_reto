# 09 · Plan de descubrimiento — La caja negra

> **Plan ejecutado (2026-10-10).** El log real está en
> [`experimentos.jsonl`](../../reto2-investigacion/experimentos.jsonl) (347 líneas,
> append-only) y la spec con citas en [`SPEC.md`](../../reto2-investigacion/SPEC.md).
> Este documento fue el plan inicial; se conserva como historial.

## Bloqueantes de acceso

Obtener el README del material, URL del original, credenciales por canal privado, límites de llamadas, formatos de spec/log y método autorizado para restaurar el original. No asumir que su reset sea el del reemplazo. Aclarar herramientas permitidas si hay duda; utilizar scripts/fuzzers propios, no soluciones automáticas de ingeniería inversa.

## Ciclo mínimo

1. Formular una pregunta y dos hipótesis que el request pueda distinguir.
2. Preparar estado inicial conocido con el mecanismo documentado, o registrar que no está controlado.
3. Enviar un experimento controlado: cambiar una variable respecto al baseline.
4. Capturar request, respuesta, secuencia y contexto en el formato oficial; no seguir redirecciones ni ocultar errores automáticamente.
5. Repetir lo necesario para detectar estado/no determinismo, dentro del presupuesto permitido.
6. Citar líneas del log en la spec; distinguir observación de generalización.
7. Crear caso de regresión y probar el reemplazo. Reservar variaciones nuevas para validación.

## Orden de exploración

| Fase | Pregunta | Experimentos propios propuestos |
| --- | --- | --- |
| 1. Baseline | ¿Cómo recibe y responde? | Request indicado en el material; capturar status, headers y cuerpo sin normalizar |
| 2. Rutas/métodos | ¿Cómo trata rutas y métodos diferentes? | Rutas conocidas y una inexistente; métodos, slash final, query y encoding según interfaz |
| 3. Autenticación | ¿Qué valida primero? | Token correcto, ausente e incorrecto; combinar con ruta/body inválidos |
| 4. Entradas | ¿Qué tipos, valores y límites acepta? | Ausente vs. vacío vs. null, tipos incorrectos, límites vecinos, Unicode; JSON solo si aplica |
| 5. Errores | ¿Qué error gana cuando hay varios? | Pares de condiciones inválidas; verificar status, texto, estructura y efectos |
| 6. Estado | ¿El pasado altera la respuesta? | Repetición A→A, orden A→B frente a B→A, aislamiento por recurso/token si aplica |
| 7. Reset | ¿Qué restaura y quién puede hacerlo? | Usar reset documentado del original; comparar secuencias y auth antes/después |
| 8. Generalización | ¿La regla sobrevive a casos nuevos? | Fuzzer propio con semilla y presupuesto; variaciones de frontera y secuencias reservadas |

No generar carga ilimitada ni probar operaciones destructivas fuera del entorno autorizado. Concurrencia solo si el material la permite y hay una hipótesis que investigar.

## Contenido de captura propuesto

El formato oficial del material manda; estos son datos a conservar, no un esquema impuesto:

- ID, fecha, entorno, semilla si existe y objetivo del experimento.
- Preparación de estado y orden de llamadas.
- Método, ruta/query, headers relevantes y body exacto; secretos redactados de forma consistente.
- Status, headers relevantes, body y errores de transporte por separado.
- Observación, hipótesis pendiente y enlace al comportamiento `B-xx`.

Mantener el log append-only y referencias estables. Conservar payloads malformados como bytes/texto, no parsearlos y reserializarlos perdiendo evidencia.

## Comparación diferencial

Ejecutar la misma entrada/secuencia desde estados iniciales equivalentes en original y reemplazo, **solo desde las herramientas de desarrollo**. Comparar status, headers requeridos, cuerpo y consecuencias visibles. Determinar con el README si el cuerpo se compara por bytes o semántica; hasta entonces conservar ambos y no ignorar campos cambiantes sin justificación.

La prueba no cuenta como coincidencia si el estado inicial es desconocido o el original no respondió. Registrar esas limitaciones. Reiniciar cada lado mediante su propio mecanismo autorizado. El reemplazo nunca usa al original como fallback.

## Salidas del trabajo

Log oficial real + spec con citas + casos reproducibles + resultados por commit. Ver salidas reales enlazadas arriba (antes: "ninguno existe aún").

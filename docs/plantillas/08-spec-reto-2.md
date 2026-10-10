# 08 · Spec + log — solo Reto 2

> **ARCHIVADA como plantilla inicial (2026-10-10).** La spec activa está en
> [`reto2-investigacion/SPEC.md`](../../reto2-investigacion/SPEC.md), con el log real en
> [`experimentos.jsonl`](../../reto2-investigacion/experimentos.jsonl) y la cronología en
> [`BITACORA.md`](../../reto2-investigacion/BITACORA.md). Este documento se conserva
> como historial del formato de partida; **no es un entregable**.

**Entregable obligatorio del Reto 2. Cierre:** 20:00, con ejecución.
**Estado:** plantilla sin observaciones; no describe un servicio real todavía. Adaptar al formato del README del material antes de entregar.

Objetivo oficial: otro ingeniero puede reimplementar el servicio a partir de la spec. Cada comportamiento debe citar la línea del log que lo prueba; distinguir confirmado de supuesto y evitar afirmaciones falsas.

## Evidencia fuente

- Servicio y versión/entorno observado: [PENDIENTE]
- Archivo de log entregado y formato oficial: [PENDIENTE]
- Procedencia y método de captura: [PENDIENTE]
- Convención de referencia: `ruta-del-log:Linicio-Lfin`.

Mantener estable el log citado y conservar solicitudes, respuestas y contexto necesario para interpretar cada observación. No crear un log de ejemplo que parezca evidencia real. Si hay secretos/datos sensibles, documentar cualquier redacción y conservar referencias estables en la versión entregada.

## Contrato de evaluación vs. comportamiento observado

El brief confirma HTTP público, bearer token del equipo, `GET /health` → 200 al estar listo y `POST /__reset` → estado inicial antes de cada test. Reset con token ausente/incorrecto responde como el original. Estas son instrucciones del organizador, **no experimentos**; no asignarles líneas de log inventadas. Las respuestas exactas de negocio, auth y errores requieren evidencia.

## Contrato para reimplementación

- Interfaz y operaciones: [PENDIENTE]
- Entradas: campos, tipos, obligatoriedad, valores válidos y límites: [PENDIENTE]
- Salidas: esquema, valores y formato: [PENDIENTE]
- Validaciones, errores y precedencia: [PENDIENTE]
- Estado, secuencia de llamadas y efectos secundarios, si existen: [PENDIENTE]
- Repetición, orden y determinismo, si aplica: [PENDIENTE]

Cada afirmación anterior debe enlazar un comportamiento de la tabla siguiente o marcarse como desconocida. Un ejemplo aislado confirma lo observado, no necesariamente una regla universal.

## Catálogo de comportamientos

| ID | Condición / entrada | Resultado o efecto observable | Estado | Línea(s) del log | Alcance de la evidencia / pendiente |
| --- | --- | --- | --- | --- | --- |
| B-01 | [PENDIENTE] | [PENDIENTE] | Desconocido | Sin evidencia | [PENDIENTE] |

Estados:
- **Confirmado:** observación respaldada por líneas concretas; delimitar qué prueban.
- **Supuesto:** hipótesis explícita; citar indicios si existen, no presentarlos como prueba concluyente.
- **Desconocido:** no hay evidencia suficiente; proponer cómo obtenerla.

## Preguntas y probes pendientes

| Pregunta | Prueba que distingue las hipótesis | Evidencia obtenida | Comportamiento actualizado |
| --- | --- | --- | --- |
| [PENDIENTE] | [PENDIENTE] | [PENDIENTE] | B-xx |

## Revisión de entrega

- [ ] Otro ingeniero puede implementar los comportamientos descritos sin explicaciones orales.
- [ ] Cada comportamiento confirmado cita líneas existentes del log entregado.
- [ ] Cada cita prueba lo afirmado, no solo una condición relacionada.
- [ ] Supuestos y desconocidos son visibles; no se generaliza más allá de la evidencia.
- [ ] Errores, límites y secuencias relevantes están cubiertos cuando hay evidencia.
- [ ] Spec y log corresponden a la misma versión y reflejan el incidente si aplica.
- [ ] Formato y permisos cumplen las instrucciones oficiales.

# 04 · Plan de evaluaciones propias

**Estado:** plan diferencial para Reto 2, antes de implementar. Requests de negocio y respuestas exactas pendientes de experimentación.

El set oculto no está disponible. La rúbrica evalúa el resultado del entrypoint en la **corrida final**, incluidos casos nuevos. Confirmar contrato y mecanismo de ejecución; nuestros casos no sustituyen el set oculto ni garantizan su resultado.

## Escala oficial del resultado oculto

| Porcentaje de casos resueltos en la corrida final | Nota |
| --- | --- |
| Menos del 25% | 1 |
| Desde 25% hasta 50% | 2 |
| Más del 50% hasta 75% | 3 |
| Más del 75% | 4 |

Esta escala corresponde a ese criterio, no a toda la nota de ejecución. Las mediciones locales deben etiquetarse como propias.

## Criterio de aceptación

Meta local propuesta: 100% de coincidencia en regresiones confirmadas y 100% de comportamientos confirmados con citas válidas. Medir por separado casos reservados. No llamar al original desde el reemplazo; health, reset y disponibilidad pública son obligatorios. El tamaño del conjunto y comparador exacto se fijan al leer el material.

## Casos

Cada caso debe tener entrada concreta y un resultado esperado independiente de la implementación. Eliminar categorías que no apliquen.

| ID | Categoría | Dado (entrada/contexto) | Cuando (acción) | Entonces (resultado verificable) | Prioridad |
| --- | --- | --- | --- | --- | --- |
| E-01 | Readiness | Servicio listo + token válido | GET /health | Status 200 (contrato oficial) | Obligatoria |
| E-02 | Reset | Estado modificado por secuencia por descubrir | POST /__reset con token válido y repetir lectura | Resultado igual al estado inicial; respuesta exacta pendiente | Obligatoria |
| E-03 | Auth inválida | Sin token o con token distinto | Request y reset | Status/body y efectos coinciden con original; evidencia pendiente | Alta |
| E-04 | Ruta inexistente | Estado inicial equivalente | Ruta no existente por seleccionar | Misma respuesta observable que original | Alta |
| E-05 | Fronteras/errores | Entrada concreta por descubrir | Mismo request en ambos servicios | Mismo error, formato y precedencia | Alta |
| E-06 | Estado | Secuencia por descubrir desde estado controlado | Repetir/alterar orden y reiniciar | Mismos resultados y efectos observables | Alta |

## Métricas

Umbrales propuestos antes de observar resultados; no son garantías del set oculto.

| Métrica | Definición | Umbral local | Método |
| --- | --- | --- | --- |
| Equivalencia de regresiones | Casos coincidentes ÷ casos comparables ejecutados | 100% | Comparador diferencial según material; conservar diferencias |
| Equivalencia en reservados | Casos nuevos coincidentes ÷ casos nuevos comparables | Meta 100%; reportar valor real | Variaciones y secuencias no usadas para inferir reglas |
| Trazabilidad | Reglas confirmadas con citas válidas ÷ reglas confirmadas | 100% | Revisar existencia y suficiencia de líneas del log |
| Contrato de despliegue | Health, reset, auth y acceso público comprobados | Todos los checks | Smoke test desde internet |

Reportar aparte casos no comparables y su causa; nunca contarlos como éxitos. Registrar tamaño de muestra y tiempo de respuesta para detectar riesgos de timeout; límite oficial pendiente.

Si hay salidas no deterministas: definir repeticiones, criterio de juicio y variabilidad. Si hay evaluación humana: guardar la rúbrica, no solo una opinión.

## Protocolo reproducible

- Datos y procedencia: [PENDIENTE]
- Separación entre casos de desarrollo y validación: [PENDIENTE]
- Baseline y condiciones de comparación: [PENDIENTE]
- Comando, entorno y configuración: [PENDIENTE]
- Ubicación de resultados sin secretos ni datos sensibles: [PENDIENTE]

## Registro de resultados

| Fecha / commit | Conjunto y tamaño | Métrica | Baseline | Solución | Cumple umbral | Fallos relevantes |
| --- | --- | --- | --- | --- | --- | --- |
| [PENDIENTE] | [PENDIENTE] | [PENDIENTE] | No medido | No medido | No evaluado | [PENDIENTE] |

No publicar cifras hasta ejecutar las pruebas. Registrar fallos además de éxitos.

## Lectura de fallas para el debrief

| Caso / resultado observado | Resultado esperado | Causa concreta | Evidencia que apoya la causa | Corrección o siguiente prueba |
| --- | --- | --- | --- | --- |
| [PENDIENTE] | [PENDIENTE] | [PENDIENTE] | [PENDIENTE] | [PENDIENTE] |

Marcar causas no verificadas como hipótesis. Si no se exponen los casos ocultos, declarar ese límite sin inventar diagnósticos. Reejecutar regresiones después del incidente de las 15:30 y comparar antes/después.

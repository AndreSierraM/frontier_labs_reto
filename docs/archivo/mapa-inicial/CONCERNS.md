# Riesgos y pendientes

## Riesgos prioritarios

| Severidad | Riesgo | Evidencia | Impacto | Acción |
|---|---|---|---|---|
| Alta | No hay implementación, runtime ni despliegue. | `docs/codebase/.codebase-scan.txt` | No se puede validar ni entregar un entrypoint. | Elegir stack mínimo e implementar el recorrido completo. |
| Alta | Sólo hay 20 ejemplos de una secuencia; el set oculto usa secuencias nuevas. | `frontier-reto-2/README.md` | Sobreajuste y fallos de estado/errores. | Ejecutar experimentos controlados y reservar validaciones. |
| Alta | Auth, reset, rutas desconocidas y cuerpos malformados no están observados. | `frontier-reto-2/README.md`, `docs/08-spec-reto-2.md` | El framework puede divergir antes de la lógica. | Sondar primero y registrar precedencia exacta. |
| Media | El servicio original puede cambiar hasta las 20:00. | `frontier-reto-2/README.md` | Reglas ya implementadas pueden quedar obsoletas. | Mantener regresiones y registrar el incidente/cambios. |
| Media | El estado es local al proceso en la evaluación. | `frontier-reto-2/README.md` | Un despliegue multiinstancia puede romper secuencias. | Usar una instancia o una estrategia de estado coherente. |

## Deuda técnica

No hay deuda de código todavía. La documentación anterior contenía bloqueantes que el nuevo material ya resuelve; se actualizó para distinguir lo confirmado de lo aún desconocido.

## Seguridad

| Riesgo | Categoría | Mitigación actual | Brecha |
|---|---|---|---|
| Exposición de token | A02: Cryptographic Failures | El material y la documentación prohíben publicarlo. | Falta una configuración de secretos/`.gitignore` verificable. |
| Dependencia prohibida al original | N/A | El diseño lo separa del runtime. | Falta código y revisión de despliegue. |

## Rendimiento y fragilidad

No hay métricas ni código. El límite de cinco segundos por paso y la semántica de estado hacen frágiles el parsing automático, los timeouts y el escalado a varias instancias.

No hay archivos de alto churn: sólo existe el commit inicial; el scan registra `.gitattributes` como único archivo en el historial.

## Preguntas [ASK USER]

1. ¿Cuál es el token de trabajo y está autorizado usarlo ahora para iniciar los experimentos?
2. ¿Qué runtime/hosting prefieres, o autorizas que se elija el mínimo para un solo proceso?
3. ¿Este repositorio será el público de entrega o habrá que mover el reemplazo a otro repositorio?

## Evidencia

- `docs/codebase/.codebase-scan.txt`
- `frontier-reto-2/README.md`
- `docs/08-spec-reto-2.md`

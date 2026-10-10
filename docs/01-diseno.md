# Diseño · Máquina de estados compatible

**Entregable Systems Design (30%, cierre 12:00):** [HTML de una página](entregables/01-diseno-sistemas.html) y [diagrama](entregables/02-diagrama-arquitectura.html). Este documento amplía sus decisiones.

## Modelo

El servicio es una **máquina de estados extendida**: `δ(S, evento) = (S′, respuesta)`. El estado incluye cuentas, saldos, operaciones, contadores de IDs y fallos de transferencia. Un mensaje es un evento, no un cálculo aislado. Los estados de control de cuenta/operación son finitos, pero los datos variables impiden describir todo el sistema como una FSM finita simple.

La documentación preserva status HTTP, cuerpo y efectos del contrato, incluso en errores. No se corrigen bugs heredados ni se añaden reglas bancarias plausibles.

## Contrato

El evaluador ejecuta 100 tests: 40 simples, 45 secuencias de 2–5 requests y 15 de 6–12; reset al iniciar cada test y límite de 5 segundos por paso. Requiere bearer, `POST /msg`, `GET /health` y `POST /__reset`, además de rutas inválidas compatibles. Cada respuesta se compara por status y cuerpo (JSON por semántica; texto exacto si no es JSON).

## Supuestos, límites y exclusiones

- Un proceso y una instancia, token del equipo y estado no compartido entre réplicas. No se implementa multi-tenancy.
- La entrega actual usa Map: un reinicio pierde estado. La durabilidad entre reinicios no es un requisito explícito del reto; SQLite se propone si se exige continuidad.
- Se excluyen comandos nuevos, correcciones de anomalías heredadas, invariantes bancarias añadidas, auditoría histórica general y escalado horizontal porque no ayudan a la compatibilidad requerida.
- Desempates de sugerencias, efectos sobre fallos del destino y precisión acumulada siguen pendientes de confirmar; registrar defaults como supuestos y añadir casos discriminantes.

## Arquitectura hexagonal mínima

1. **Adaptador HTTP:** autentica/enruta, conserva los bytes relevantes y emite respuestas exactas. No hace reglas de saldo ni normaliza IDs.
2. **Núcleo profundo:** concentra parser, control ISO 7064, guardas en orden, transiciones y resultados detrás de una interface de mensaje/reset. Las pruebas y el adaptador cruzan la misma seam.
3. **Estado actual:** Map pasado al núcleo, con transiciones síncronas en un proceso. **Seam propuesta al migrar:** una ejecución transaccional conjunta para el contexto; no un repositorio CRUD público por tabla ni una interfaz por comando.

Implementación actual en `reemplazo/src/server.js` y `reemplazo/src/domain.js`. SQLite no está implementado; requiere adaptar acceso a estado, validar driver/runtime y probar la migración sin alterar reglas.

Guardas, cálculo del control y handlers viven como funciones internas. No hacen falta librería FSM, ORM, event sourcing, contenedor de dependencias ni microservicios.

**KISS:** monolito y un escritor. **DRY:** una implementación de cada regla y transición. **SOLID pragmático:** transporte y persistencia no dictan las reglas del núcleo.

## Modelo de estados

- `S = {cuentas, operaciones, nextCuenta, nextOperacion}`.
- Cuenta: `id`, `nombre`, `saldo`, `fallos`. **Activa** si `fallos < 3`; **bloqueada** si `fallos ≥ 3`. El bloqueo es **derivado**; no se duplica con un booleano que pueda desincronizarse.
- Operación: `id`, `tipo`, `monto`, cuentas involucradas y `anulada`. **Vigente** o **anulada**.
- `x-req` es auxiliar de transporte; no es parte del estado de negocio reiniciado por reset ni se compara en evaluación.

| Evento / guarda | Cambio de estado | Respuesta / evidencia |
|---|---|---|
| PING válido / CONSULTA existente | No muta el estado de negocio. | Pong / saldo observado. |
| ALTA válida | Crea cuenta con saldo y fallos cero; avanza AC. | 201, cuentaId. |
| DEPOSITO válido | Suma saldo, pone fallos=0, crea operación y avanza OP. | 200, `recieved`; desbloquea (log 254–267). |
| TRANSFER, monto excede límite o saldo, origen no bloqueado | Incrementa fallos; el tercer fallo ya deja el origen bloqueado. No crea operación. | 422 E506/E507; **sí hay transición**. |
| TRANSFER elegible, fallos≥3 | No vuelve a debitar ni a sumar fallos. | 409 E510. Monto, igualdad y existencia se validan antes (log 329–332). |
| TRANSFER válida | Debita/acredita, pone fallos del origen a cero, crea OP. | 200; log 240–248. |
| ANULA vigente | Revierte el efecto de la operación y la marca anulada; no limpia fallos. | 200 ok:true; log 101–116, 268–278. |
| ANULA ya anulada | Sin segunda reversión. | 200 ok:false. |
| RESET autorizado | Borra cuentas y operaciones; reinicia AC/OP a 1. | Estado inicial antes del siguiente test. |

No presumir que cualquier error sea una auto-transición: `E506/E507` cambian el estado. No inventar una restricción de saldo no-negativo; las anulaciones siguen la semántica observada.

## Persistencia propuesta y operación

SQLite es condicional a una necesidad de durabilidad, no una capacidad de la entrega actual. Tres tablas concretas: **cuentas**, **operaciones** y **contadores**. Archivo en volumen local persistente, SQL parametrizado, transacciones, WAL y espera de lock acotada.

- Commit de depósito/transferencia/reverso junto con saldos, operación y contador.
- Commit del incremento de fallos en `E506/E507` aunque la respuesta sea 422.
- Rollback de una transacción por fallo interno; no por cualquier resultado HTTP no-2xx.
- Reset borra estado y reinicia secuencias de manera atómica.
- Readiness sólo después de abrir/migrar la DB; se conserva el contrato público de health.
- Sin caché de saldo, TTL, cola ni reintentos ciegos tras timeout de mutación.

## Trade-offs

| Decisión | Alternativa descartada | Coste aceptado |
|---|---|---|
| Máquina de estados en monolito | Framework FSM o microservicios | Concurrencia serializada; menor complejidad operativa. |
| Map para la entrega actual | DB inmediata: operación/migraciones sin durabilidad exigida | Reinicio pierde estado; una sola instancia. |
| SQLite si se requiere durabilidad | PostgreSQL inicial: servidor adicional sin escrituras distribuidas | Volumen, migración y locks; un escritor. |
| Una instancia | PostgreSQL + réplicas desde el inicio | No escala horizontalmente. Revisar sólo con necesidad real de escritura distribuida. |
| Conservar el estado necesario | Event sourcing / ledger ideal | Sin reconstrucción histórica general; sólo lo necesario para el contrato. |

PostgreSQL sería una evolución si se requieren varias réplicas o mayor concurrencia de escritura; implica diseñar aislamiento, IDs, reset y recuperación, no sólo cambiar el driver.

## Pruebas y cambios

Probar por la interface completa: respuestas y estado observable mediante consultas posteriores. Cubrir `0→1→2→3` fallos, bloqueo, depósito desbloqueando, éxito reiniciando fallos, errores previos sin incrementar, primera/segunda anulación y reset.

Comparar status y JSON con tipos/valores exactos, arrays ordenados; no-JSON por texto exacto. Puerta de aceptación: 100% de pasos coincidentes y cero timeouts; medir cada paso extremo a extremo en la URL pública, todos <5 s. Una media o p95 favorable no compensa un paso que alcance el límite. Registrar esperado/obtenido, reset, status, cuerpo y duración; no reintentar mutaciones a ciegas.

Antes de cada cambio, fijar resultados esperados para los casos T1–T6 del HTML: entradas/precedencia, secuencias reservadas de 2–5 y 6–12 pasos, fallos/desbloqueo, ANULA/reset, tiempo/disponibilidad y migración SQLite. De 20:00 hasta fin de demo day, health autenticado cada 60 s: cero fallos observados. Las pruebas de SQLite sólo aplican al migrar (reinicio, rollback, persistencia de errores y locks).

Resultados locales disponibles: 21 pruebas de dominio + smoke HTTP; batería 116/116 (20 HTTP oficiales, 62 HTTP adicionales y 34 pares de control), con imagen Docker construida y probada. Esto no acredita el set oculto, el endpoint público ni SQLite. El plan no debe confundirse con pruebas ya completadas.

Cambios de formato/rutas quedan en el adaptador; reglas, en el núcleo; persistencia requiere adaptar acceso y probar la migración, no rediseñar las reglas.

## Evidencia

- `frontier-reto-2/README.md`, `frontier-reto-2/pruebas/ejemplos.jsonl`.
- `reto2-investigacion/experimentos.jsonl`: 347 observaciones; tramos 5–7, 101–116, 240–278, 309–336.
- `reto2-investigacion/data/pares_control.jsonl`: 34 pares de control confirmados.
- `reto2-investigacion/SPEC.md`: usar el log para resolver contradicciones, por ejemplo C-05 frente al registro 6 sobre control `03`.
- `reto2-investigacion/logs/fingerprint.md`: rasgos del runtime observado.

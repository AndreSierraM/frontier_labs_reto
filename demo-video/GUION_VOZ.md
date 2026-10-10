# Demostración técnica — La Caja Negra

Video: `out/demo-tecnico-2min-v17.mp4` · 1920×1080 · 30 fps · **120 segundos exactos**.

Formato: demostración visual sin voz. Las operaciones reproducen salidas locales;
los cambios de contrato proceden de la bitácora. No se presenta una ejecución en vivo.
Copy descriptivo: objetivo, operaciones, validación, arquitectura, agentes, cambios y documentación.

## Montaje

| Tiempo | Pantalla | Contenido |
| --- | --- | --- |
| 0:00–0:06 | Presentación | Implementación y validación del reto 2. |
| 0:06–0:16 | Objetivo | Contrato HTTP y criterios de comprobación. |
| 0:16–0:36 | Demostración local | Seis operaciones: entrada, respuesta JSON y saldo posterior. |
| 0:36–0:52 | Validación | 21 pruebas de dominio, 5 HTTP/aislamiento; corte de 394 observaciones y 82 filas SPEC. Los 116 casos se identifican como históricos. |
| 0:52–1:04 | Arquitectura | Adaptador HTTP, dominio, persistencia, monitor y workflow. |
| 1:04–1:22 | Agentes | Activación (6 s), paralelismo de scouts (6 s), verificación y pendientes CI (6 s). |
| 1:22–1:40 | Cambios registrados | Saldo decimal, contrato E510 y estado de apagado HALT. |
| 1:40–1:52 | Documentación | Diseño, arquitectura e índice de entregables, 4 s cada captura. |
| 1:52–2:00 | Cierre | Repositorio y documentación. |

## Locución humana opcional

**Presentación:** “La Caja Negra. Implementación y validación del reto dos.”

**Objetivo:** “El objetivo es reconstruir el contrato observable de un servicio sin acceso a su código. Comparamos el código HTTP, el cuerpo JSON y el estado posterior a cada mensaje.”

**Demostración:** “La secuencia local crea dos cuentas, deposita doscientos cincuenta y transfiere cuarenta. La consulta devuelve el saldo de destino. La anulación restaura los saldos previos. La pantalla reproduce las respuestas del dominio.”

**Validación:** “Pasan veintiuna pruebas de dominio y cinco de HTTP y aislamiento. El corte revisado contiene trescientas noventa y cuatro observaciones y ochenta y dos filas de especificación con evidencia. Los ciento dieciséis casos son un resultado histórico del proyecto.”

**Arquitectura:** “El adaptador HTTP delega en el dominio y persiste el estado en PostgreSQL. El monitor registra diferencias y GitHub Actions coordina el pipeline de adaptación.”

**Agentes:** “Un cambio pendiente activa el pipeline. Hasta dos scouts investigan en paralelo y el analista integra sus informes. Fixer, verificación, reviewer y reporter siguen en secuencia. La comparación es determinista. Quedan pendientes dos controles de CI; no hay merge automático.”

**Cambios:** “La bitácora documenta tres ajustes: saldo como cadena decimal, bloqueo con código cuatrocientos veintitrés y contador de intentos, y estado de apagado persistente hasta reset. Cada ajuste está vinculado a observaciones y commits.”

**Documentación:** “Los entregables incluyen diseño de sistemas, arquitectura, especificación, experimentos y bitácora.”

**Cierre:** “Repositorio y documentación disponibles para revisión.”

## Evidencia y alcance

- `src/demo-evidence.json`: salidas exactas de seis operaciones del dominio local.
- `node scripts/verify-demo.cjs`: ejecuta la secuencia y comprueba respuestas y saldos.
- `npm --prefix reemplazo test`: 21 pruebas de dominio y 5 HTTP/aislamiento.
- `python3 reto2-investigacion/scripts/validar_spec.py`: corte del 10 de octubre de 2026, 394 observaciones y 82 filas con evidencia. Valida el esquema y las referencias, no todos los comportamientos del servicio.
- `116/116`: resultado registrado en `README.md`; no es una nueva ejecución del evaluador externo.
- Agentes: `agent/pipeline.mjs`, `agent/lib/config.mjs` y los workflows `monitor.yml` / `swarm.yml`.
- Activación: salida `changed=1` de check, recon o watch → workflow reutilizable. También se admiten ejecución manual y `repository_dispatch: original-changed`.
- Sin eventos pendientes o en modo dry-run no se invocan agentes.
- Paralelismo: `Promise.all(changes.slice(0, maxScouts))`, con `MAX_SCOUTS=2`. No es un pool que procese automáticamente todas las etiquetas. Los scouts comparten checkout, no worktrees aislados.
- Secuencia: scouts → analyst → (fixer → tests → comparación → reviewer), hasta 2 rondas → reporter tras aprobación del pipeline.
- La comparación con la referencia es código determinista, no un sexto agente.
- Pendiente CI: el cron declara 10 minutos, pero la condición de check compara con 15 minutos.
- Pendiente CI: la apertura del PR depende de `success()` y de un diff; el proceso solo devuelve error para `failed`, no para `inconclusive` o `needs-review`. No se afirma que el gate del PR esté resuelto.
- Esta revisión no modifica workflows ni ejecuta el enjambre en producción.
- Cambios de contrato: tabla de incidente en `reto2-investigacion/BITACORA.md`, observaciones 370/372, 380/381 y 387–390.
- No se afirma compatibilidad universal, cero divergencias generales ni despliegue verificado.

## Render

```sh
cd demo-video
node scripts/verify-demo.cjs
npm run lint
npx remotion render src/index.ts la-caja-negra-demo out/demo-tecnico-2min-v17.mp4 --codec=h264
```

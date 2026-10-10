# Demo de resultados — La Caja Negra

Video: `out/demo-resultados-2min-v16.mp4` · 1920×1080 · 30 fps · **120 segundos exactos**.

Formato: demo visual sin voz. Las operaciones y cambios se presentan como
reproducciones de evidencia local o registrada, no como una sesión en vivo.

## Montaje de dos minutos

| Tiempo | Pantalla | Mensaje |
| --- | --- | --- |
| 0:00–0:06 | Presentación | Reemplazo HTTP, pruebas y entregables. |
| 0:06–0:16 | El reto | Conservar respuesta y estado, y adaptarse a cambios. |
| 0:16–0:36 | Demostración local | Crear dos cuentas, depositar, transferir, consultar y anular. Respuestas exactas y saldos tras cada operación. |
| 0:36–0:52 | Resultados | 21 pruebas de dominio, 5 de HTTP/aislamiento, 390 observaciones, 78 reglas y validación registrada de 116 casos. |
| 0:52–1:04 | La solución | Servicio HTTP, persistencia, monitor y agentes que proponen un PR. |
| 1:04–1:22 | Adaptaciones registradas | Saldo decimal, nuevo contrato E510 y estado de apagado HALT. |
| 1:22–1:34 | Trazabilidad | Observación 349 → regla I-01 → comprobación del SPEC. |
| 1:34–1:52 | Entregables | Capturas de diseño, arquitectura e índice de documentación. |
| 1:52–2:00 | Cierre | Código, demo y evidencia. |

## Locución humana opcional

**Presentación:** “La Caja Negra: estos son los resultados del reto dos de Frontier Labs.”

**El reto:** “Sin acceso al código original, construimos un reemplazo que conserva sus respuestas y su estado, y que puede adaptarse cuando el servicio cambia.”

**Demostración:** “Creamos dos cuentas. Depositamos doscientos cincuenta en la primera y transferimos cuarenta a la segunda. La consulta confirma el saldo recibido. Al anular la transferencia, ambas cuentas recuperan sus saldos anteriores. Estas respuestas se obtuvieron ejecutando el dominio local.”

**Resultados:** “Pasan veintiuna pruebas de dominio y cinco de HTTP y aislamiento. El log contiene trescientas noventa observaciones y la especificación, setenta y ocho reglas con evidencia. El proyecto registra además ciento dieciséis casos de validación aprobados.”

**La solución:** “El servicio guarda el estado en PostgreSQL. Un monitor detecta cambios y los agentes proponen adaptaciones mediante pull requests, sin hacer merge automático.”

**Adaptaciones:** “La bitácora registra cambios concretos: el saldo pasa a cadena decimal; el bloqueo responde con status cuatrocientos veintitrés y un contador; y HALT incorpora un estado de apagado que persiste hasta un reset. Cada cambio tiene observaciones y commits identificables.”

**Trazabilidad:** “Por ejemplo, la observación trescientos cuarenta y nueve respalda la regla de health. Un validador comprueba el esquema del log y la evidencia citada por el SPEC.”

**Entregables:** “Entregamos el diseño de sistemas, el diagrama de arquitectura, la especificación y el log. Las decisiones se pueden rastrear hasta sus observaciones.”

**Cierre:** “El código, la demo y la evidencia están disponibles para revisión.”

## Evidencia y límites

- `src/demo-evidence.json`: salidas exactas de seis operaciones del dominio local, incluidos control, respuesta y saldos.
- `node scripts/verify-demo.cjs`: vuelve a ejecutar la secuencia y verifica las salidas mostradas en el video.
- `npm --prefix reemplazo test`: 21 pruebas de dominio y 5 de HTTP/aislamiento.
- `python3 reto2-investigacion/scripts/validar_spec.py`: 390 observaciones y 78 filas con evidencia, sin red.
- `116/116`: validación registrada en `README.md`, no una nueva ejecución ni resultado del evaluador externo.
- Adaptaciones: tabla del incidente en `reto2-investigacion/BITACORA.md`, IDs 370/372, 380/381 y 387–390.
- Trazabilidad: observación 349 de `experimentos.jsonl` y regla I-01 de `SPEC.md`.
- No se afirma compatibilidad universal, cero divergencias generales ni despliegue verificado en esta revisión.

## Render

```sh
cd demo-video
node scripts/verify-demo.cjs
npm run lint
npx remotion render src/index.ts la-caja-negra-demo out/demo-resultados-2min-v16.mp4 --codec=h264
```

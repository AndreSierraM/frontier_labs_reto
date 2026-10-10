# Demo de resultados — La Caja Negra

Video: `out/demo-resultados-v15.mp4` · 1920×1080 · 30 fps · **67,5 segundos**.

Formato entregado: demo visual sin voz. Los títulos, cifras y documentos cuentan
el resultado por sí mismos. La locución de abajo es opcional para una grabación
humana; no está incluida en el MP4.

## Montaje

| Tiempo | Pantalla | Mensaje |
| --- | --- | --- |
| 0:00–0:05,5 | Presentación | Reemplazo HTTP, pruebas y entregables. |
| 0:05,5–0:15 | El reto | Recrear un servicio sin ver su código; cambios registrados con IDs de evidencia. |
| 0:15–0:30,5 | Resultados | 21 pruebas de dominio, 5 de HTTP/aislamiento, 390 observaciones y 78 reglas con evidencia. |
| 0:30,5–0:42 | La solución | Servicio, persistencia, vigilancia y agentes que proponen un PR. |
| 0:42–0:59,5 | Entregables | Capturas de diseño, arquitectura e índice de documentación. |
| 0:59,5–1:07,5 | Cierre | Código, demo y evidencia disponibles en los enlaces mostrados. |

## Locución opcional

**Presentación:** “La Caja Negra: estos son los resultados del reto dos de Frontier Labs.”

**El reto:** “Construimos un reemplazo de un servicio sin acceso a su código. La bitácora registra cambios en saldos, límites y errores, junto con la evidencia y su adaptación.”

**Resultados:** “Las pruebas locales pasan: veintiuna de dominio y cinco de HTTP y aislamiento. El log contiene trescientas noventa observaciones y la especificación, setenta y ocho reglas con evidencia. El proyecto registra además ciento dieciséis casos de validación aprobados.”

**La solución:** “El servicio conserva su estado en PostgreSQL. Un monitor detecta cambios y los agentes proponen adaptaciones mediante pull requests, sin hacer merge automático.”

**Entregables:** “Entregamos el diseño de sistemas, el diagrama de arquitectura, la especificación y el log de experimentos. Las decisiones se pueden rastrear hasta sus observaciones.”

**Cierre:** “El código, la demo y la evidencia están disponibles para revisión.”

## Alcance de las cifras

- `npm --prefix reemplazo test`: comprobación local de 21 pruebas de dominio y 5 de HTTP/aislamiento.
- `python3 reto2-investigacion/scripts/validar_spec.py`: comprobación sin red de 390 observaciones y 78 filas con evidencia.
- `116/116`: validación registrada en `README.md`; no se presenta como una ejecución en vivo ni como un resultado del evaluador externo.
- Los cambios de saldo, límite y E510 proceden de la tabla del incidente en `reto2-investigacion/BITACORA.md`.
- No se afirma compatibilidad universal ni cero divergencias generales.

Las escenas técnicas de código, monitor, enjambre y pipeline siguen disponibles
como composiciones individuales, pero no alargan la demo principal.

## Render

```sh
cd demo-video
npm run lint
npx remotion render src/index.ts la-caja-negra-demo out/demo-resultados-v15.mp4 --codec=h264
```

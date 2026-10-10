# fix(E506): actualizar el mensaje del límite excedido

## Cambio detectado

| | |
| --- | --- |
| Etiqueta | `T-limite` |
| Antes | `422 {"error":"E506","mensaje":"límite excedido"}` |
| Después | `422 {"error":"E506","mensaje":"limite superado en el servicio"}` |
| Detectado | `2026-10-10T18:10:00Z` |

Solo cambia el **texto del mensaje**. Status (`422`), código (`E506`) y umbral (`monto > 100000` en `TRANSFER`) permanecen idénticos.

## Investigación

Los scouts reprodujeron la regla y acotaron el delta a un único aspecto:

- `120000` y `100001` → `422 {"error":"E506","mensaje":"limite superado en el servicio"}`.
- `100000` (×3) pasan → el límite es **por operación**, no acumulado.
- `DEPOSITO` sigue exento.
- `E506` se evalúa **antes** que `E507` y **después** de `E510`.
- El contador `origen.fallos` se incrementa igual que antes.

La versión "antes" no se pudo consultar en vivo, pero el umbral ya constaba en los ejemplos oficiales. El delta es de texto y está reproducido en dos secuencias independientes: confianza suficiente.

```
E506 = [422, { error: "E506", mensaje: "limite superado en el servicio" }]
```

## Adaptación

Se ajustó únicamente la entrada `E506` del catálogo `ERRORES` de `reemplazo/src/domain.js` (nivel de módulo). No fue necesario tocar `server.js` ni `storage.js`: el flujo de `TRANSFER` ya retornaba `{ code: "E506" }` y `send()` resuelve el cuerpo desde `dominio.ERRORES[code]`.

- `reemplazo/src/domain.js` — mensaje `"límite excedido"` → `"limite superado en el servicio"`.
- `reemplazo/test/domain.test.js` — 2 tests nuevos: catálogo exacto (`E506 expone el mensaje vigente`) y flujo end-to-end (`TRANSFER 100001 -> E506 con mensaje nuevo`).
- `reto2-investigacion/SPEC.md` — K-T5 (línea 111) y tabla de errores (línea 159) actualizadas para que la spec siga siendo la fuente de verdad.

## Evidencia

| Mensaje | Respuesta |
| --- | --- |
| `TRANSFER;AC-0001;AC-0002;100001` (saldo 200000) | `422 {"error":"E506","mensaje":"limite superado en el servicio"}` |
| `TRANSFER;AC-0001;AC-0002;100000` | `200 {"status":"recieved",...}` (sin cambio) |
| `DEPOSITO;AC-0001;200000` | `200` (sin cambio) |

- El test `TRANSFER 100001 -> E506 con mensaje nuevo` **falló antes** del parche (`'límite excedido'` vs `'limite superado en el servicio'`) y **pasa después**.
- `npm --prefix reemplazo test`: `EXIT=0` — 23 pruebas de dominio OK + 1 test HTTP OK, 0 fallos.
- Diferencial contra el original: `{ "ok": true, "divergences": [], "summary": "sin divergencias vs el original" }`.

## Limitaciones y riesgos

- **Bajo.** Ninguna prueba existente compara el `mensaje` de `E506`, solo el `code`; no hay regresiones internas.
- `reemplazo/README.md:79` y `reto2-investigacion/README.md:138` mencionan `E506` sin citar el texto: no requieren cambio funcional.
- Si un consumidor externo comparara el literal `"límite excedido"` quedaría desalineado; no hay rastro de ello en el repo.
- Mantener `SPEC.md` sincronizado para no reintroducir el texto viejo en futuras iteraciones.

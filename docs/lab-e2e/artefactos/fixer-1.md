All green: 23 domain tests + 1 HTTP test.

## Resumen

**Archivos tocados:**
- `reemplazo/src/domain.js` — entrada `E506` del catálogo `ERRORES`: mensaje `"límite excedido"` → `"limite superado en el servicio"` (status `422` y código `E506` sin cambios).
- `reemplazo/test/domain.test.js` — añadidos 2 tests:
  - `E506 expone el mensaje vigente` (comprueba el catálogo exacto).
  - `TRANSFER 100001 -> E506 con mensaje nuevo` (comprueba el flujo end-to-end).
- `reto2-investigacion/SPEC.md` — K-T5 (línea 111) y tabla de errores (línea 159) actualizadas al nuevo texto.

**Cambio aplicado:** solo el delta de texto diagnosticado, en el catálogo de errores. El flujo `TRANSFER` ya retornaba `{ code: "E506" }` y `send()` resuelve el cuerpo desde `ERRORES`, así que no fue necesario tocar `server.js` ni `storage.js`.

**Verificación:** el test `TRANSFER 100001 -> E506 con mensaje nuevo` falló antes del parche (`'límite excedido'` vs `'limite superado en el servicio'`) y pasa después.

**Resultado `npm --prefix reemplazo test`:** `EXIT=0` — 23 pruebas del dominio OK + 1 test HTTP OK (0 fallos).

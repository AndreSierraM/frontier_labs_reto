# Diagnóstico · T-limite

## 1 · Qué cambió respecto a `SPEC.md`

Solo el **texto del mensaje** del error `E506`. El resto (status `422`, código `E506`, umbral `monto > 100000`, prioridad sobre `E507`, incremento del contador de fallos, no aplicación a `DEPOSITO`, límite por operación y no acumulado) permanece idéntico.

| Aspecto | Spec vigente (`SPEC.md` K-T5 / tabla E506) | Servicio ahora |
| --- | --- | --- |
| status | `422` | `422` |
| `error` | `E506` | `E506` |
| `mensaje` | `"límite excedido"` | `"limite superado en el servicio"` |

La evidencia del scout es coherente: `120000` y `100001` → E506, `100000` ×3 pasan (límite por operación), `DEPOSITO` exento, y `E506` antes que `E507`. La versión "antes" no se pudo consultar en vivo, pero el umbral ya constaba en los ejemplos oficiales. Confianza suficiente: el delta es de texto y está reproducido.

## 2 · La regla exacta

```
E506 = [422, { error: "E506", mensaje: "limite superado en el servicio" }]
```

Condición sin cambios: en `TRANSFER`, `monto > 100000` → `E506`, evaluado tras `E510` y antes de `E507`. Se incrementa `origen.fallos`.

Evidencia mínima: `422 {"error":"E506","mensaje":"limite superado en el servicio"}` para `120000` y `100001`; `200` para `100000`.

## 3 · Qué tocar

**Archivo:** `reemplazo/src/domain.js`
**Función/estructura:** catálogo `ERRORES` (nivel de módulo), entrada `E506` (línea ~27).

```js
// antes
E506: [422, { error: "E506", mensaje: "límite excedido" }],
// después
E506: [422, { error: "E506", mensaje: "limite superado en el servicio" }],
```

No hay que tocar `server.js` ni `storage.js`: `send()` consume `dominio.ERRORES[code]` y el flujo de `TRANSFER` retorna `{ code: "E506" }`, que resuelve el cuerpo desde el catálogo.

**Actualización documental (no código):** `reto2-investigacion/SPEC.md` líneas 111 (K-T5) y 159 (tabla de errores) deben reflejar el nuevo texto para que la spec siga siendo la fuente de verdad.

## 4 · Casos de prueba nuevos

Añadir al final del bloque `comandos y estado` de `reemplazo/test/domain.test.js`:

```js
test("E506 expone el mensaje vigente", () => {
  assert.deepStrictEqual(d.ERRORES.E506, [
    422,
    { error: "E506", mensaje: "limite superado en el servicio" },
  ]);
});
test("TRANSFER 100001 -> E506 con mensaje nuevo", () => {
  const s = st();
  d.processMessage(s, "ALTA;A;" + d.control("ALTA;A"));
  d.processMessage(s, "ALTA;B;" + d.control("ALTA;B"));
  d.processMessage(s, "DEPOSITO;AC-0001;200000;" + d.control("DEPOSITO;AC-0001;200000"));
  const r = d.processMessage(s, "TRANSFER;AC-0001;AC-0002;100001;" + d.control("TRANSFER;AC-0001;AC-0002;100001"));
  assert.strictEqual(r.code, "E506");
  assert.strictEqual(d.ERRORES.E506[1].mensaje, "limite superado en el servicio");
});
```

| Caso | Mensaje exacto | Resultado esperado |
| --- | --- | --- |
| Transfer 100001 (saldo 200000) | `TRANSFER;AC-0001;AC-0002;100001` | `422 {"error":"E506","mensaje":"limite superado en el servicio"}` |
| Transfer 100000 (límite) | `TRANSFER;AC-0001;AC-0002;100000` | `200 {"status":"recieved",...}` (sin cambio) |
| Depósito 200000 | `DEPOSITO;AC-0001;200000` | `200` (sin cambio) |

## 5 · Riesgos

- **Bajo.** Ninguna prueba actual compara el `mensaje` de E506; solo comparan `code`, por lo que no hay regresiones internas.
- `reemplazo/README.md:79` y `reto2-investigacion/README.md:138` mencionan `E506` sin citar el texto; no requieren cambio funcional.
- Si algún consumidor externo comparara el string `"límite excedido"`, quedaría desalineado; no hay rastro de ello en el repo.
- Actualizar `SPEC.md` para no reintroducir el texto viejo en futuras iteraciones.

## 6 · Suficiencia de evidencia

Evidencia suficiente: el monitor aporta antes/ahora con timestamp y el scout reproduce la regla en dos secuencias independientes. El cambio es un delta de texto no ambiguo.

PATCH: yes

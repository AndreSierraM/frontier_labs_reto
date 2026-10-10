# Informe · T-limite

## Conclusión
El cambio de la etiqueta **T-limite** es **solo cosmético en el mensaje** de E506: pasó de `"límite excedido"` a `"limite superado en el servicio"`. La regla de negocio (límite por transferencia) y el umbral **no cambiaron**: sigue siendo monto de `TRANSFER` **> 100.000** ⇒ 422 E506.

## Regla propuesta
- Comando `TRANSFER;origen;destino;monto;control`:
  - `monto > 100000` ⇒ `422 {"error":"E506","mensaje":"limite superado en el servicio"}`
  - `monto <= 100000` ⇒ continúa la validación (E507 si saldo insuficiente, etc.).
- El límite es **por operación individual**, no acumulado: varias transferencias de 100.000 seguidas (300.000 acumulados) pasan.
- **No aplica a `DEPOSITO`**: depósitos de 200.000 y 1.000.000 fueron aceptados.
- **Orden de evaluación**: E506 (límite) se evalúa **antes** que E507 (saldo): con saldo 1.000, `TRANSFER` de 200.000 devuelve E506, no E507.

## Evidencia

| mensaje | status + cuerpo |
|---|---|
| `TRANSFER;AC-0001;AC-0002;120000` (saldo 1.000.000) | `422 {"error":"E506","mensaje":"limite superado en el servicio"}` |
| `TRANSFER;AC-0001;AC-0002;100001` (saldo 1.000.000) | `422 {"error":"E506","mensaje":"limite superado en el servicio"}` |
| `TRANSFER;AC-0001;AC-0002;100000` (1.ª vez) | `200 {"status":"recieved","operacionId":"OP-0002"}` |
| `TRANSFER;AC-0001;AC-0002;100000` (2.ª vez) | `200 {"status":"recieved","operacionId":"OP-0003"}` |
| `TRANSFER;AC-0001;AC-0002;100000` (3.ª vez, 300.000 acumulado) | `200 {"status":"recieved","operacionId":"OP-0004"}` |
| `DEPOSITO;AC-0001;200000` | `200 {"status":"recieved","operacionId":"OP-0005"}` |
| `DEPOSITO;AC-0001;1000000` | `200 {"status":"recieved","operacionId":"OP-0001"}` |
| `TRANSFER;AC-0001;AC-0002;200000` (saldo 1.000) | `422 {"error":"E506","mensaje":"limite superado en el servicio"}` (no E507) |
| `TRANSFER;AC-0001;AC-0002;50000` (saldo 1.000) | `422 {"error":"E507","mensaje":"saldo insuficiente"}` |

Contraste con la versión "antes" (ejemplos oficiales): `120000` ya daba E506 (umbral idéntico) y `100000` ya pasaba (ejemplo 10) ⇒ el umbral no cambió, solo el texto.

## Confianza
**Confirmado** para la regla vigente (reproducido en dos secuencias independientes tras `__reset`). El carácter "solo cosmético" del cambio se apoya en la evidencia entregada (antes/ahora) y en los ejemplos oficiales previos.

## Qué NO pudiste determinar
- No pude consultar la versión "antes" en vivo (el servicio ya está actualizado); la comparación con el umbral previo se basa en los ejemplos oficiales.
- No probé si existe un límite acumulado diario con umbral > 300.000 (solo descarté acumulado ≤ 300.000).
- No exploré otros comandos fuera de `TRANSFER`/`DEPOSITO` ni montos ≤ 0 o no enteros (fuera de la etiqueta).
- La marca temporal exacta del cambio más allá del `detectado: 2026-10-10T18:10:00Z` proporcionado.

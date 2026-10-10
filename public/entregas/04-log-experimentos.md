# La caja negra · Log de experimentos

Frontier Labs · Reto 2 · **394 observaciones reales** contra el original · JSONL validado · evidencia verificada · IDs 1–394.

**Qué es:** una línea JSON por cada request enviado al servicio original, con la hipótesis, el request, el status y el cuerpo exacto de la respuesta. Es la fuente de evidencia del [SPEC](SPEC.md) y se puede descargar íntegro.

## Resumen

| Métrica | Valor |
| --- | --- |
| Observaciones | 394 (IDs 1–394) |
| Secuencias | 17 |
| Códigos de error | 20 |
| Status observados | 200×109, 201×72, 400×114, 401×2, 404×26, 409×19, 413×1, 422×46, 423×2, 429×1, 503×2 |

## Esquema del registro

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | entero | Número de línea, único y contiguo desde 1. El SPEC cita estos ids. |
| `seq` | texto | Secuencia de la que forma parte (todas tras un `__reset`). |
| `x_req` | texto \| null | Valor del header `X-Req` de la respuesta. |
| `hipotesis` | texto | Qué se estaba probando con ese request. |
| `request` | objeto | Cuerpo enviado a `POST /msg`, o `{method,path[,body]}` para sondas de ruta. |
| `status` | entero | Status HTTP observado en el original. |
| `response` | objeto | Cuerpo exacto observado. |
| `conclusion` | texto | Qué se aprendió (puede ir vacío). |

## Organizado por secuencia

| Secuencia | IDs | n | Errores | Hipótesis de ejemplo |
| --- | --- | --- | --- | --- |
| `integridad` | 1–16 | 16 | E103, E104, E201, E202, E401 | mensaje sin separador: ¿E103 falta control? |
| `aridad` | 17–46 | 30 | E302, E303, E401, E402 | aridad de PING con 0 args extra |
| `alta` | 47–57 | 11 | E104 | nombre de 1 carácter |
| `consulta` | 58–64 | 7 | E401 | consulta antes de crear: ¿E401? |
| `deposito` | 65–86 | 22 | E303, E401 | crear AC-0001 |
| `transfer` | 87–100 | 14 | E303, E304, E401, E506 | crear AC-0001 |
| `anula` | 101–116 | 16 | E402 | crear AC-0001 |
| `estado` | 117–121 | 5 | — | AC-0001 tras reset |
| `bordes` | 122–163 | 42 | E103, E104, E201, E202, E302, E303, E304, E401, E506, E507, E510 | crear AC-0001 |
| `bloqueo` | 164–239 | 76 | E303, E401, E506, E507, E510 | cuenta AC-0001 |
| `bloqueo3` | 240–278 | 39 | E507, E510 | E507 #1 |
| `max` | 279–290 | 12 | E303, E506 | máximo 4294967295 |
| `sugerencia` | 291–308 | 18 | E301 | sugerencia para XYZ |
| `bloqueo4` | 309–336 | 28 | E303, E304, E401, E507, E510 | E401 #1 |
| `sugerencia2` | 337–347 | 11 | E301 | umbral sugerencia ALTXXX |
| `gaps` | 348–366 | 19 | E001, E100, E101, E102, E404 | __reset limpia estado |
| `incidente-v2` | 367–394 | 28 | E201, E301, E404, E506, E510, E520, E599 | reset del estado |

## Organizado por error

| Código | Status | n | IDs (muestra) | Hipótesis de ejemplo |
| --- | --- | --- | --- | --- |
| `E507` | 422 | 36 | 126, 127, 167, 170, 173, 175, 176, 185… | monto == saldo: ok |
| `E303` | 400 | 31 | 34, 40, 68, 70, 72, 74, 76, 78… | aridad de DEPOSITO con 2 args extra |
| `E301` | 400 | 30 | 291, 292, 293, 294, 295, 296, 297, 298… | sugerencia para XYZ |
| `E302` | 400 | 26 | 18, 19, 20, 21, 22, 24, 25, 26… | aridad de PING con 1 args extra |
| `E510` | 409 | 20 | 134, 135, 178, 179, 181, 206, 207, 208… | justo sobre el limite: E506 |
| `E401` | 404 | 19 | 13, 14, 15, 16, 28, 58, 61, 62… | ¿el control ignora el espacio? |
| `E506` | 422 | 10 | 91, 100, 128, 212, 213, 214, 290, 375… | transfer un peso sobre el umbral |
| `E304` | 400 | 6 | 97, 131, 318, 319, 320, 330 | transfer a la misma cuenta |
| `E104` | 400 | 5 | 2, 10, 11, 53, 147 | segmento de control vacío: ¿E104? |
| `E201` | 400 | 5 | 7, 8, 9, 144, 385 | tres dígitos: ¿E201? |
| `E202` | 400 | 4 | 6, 145, 150, 151 | mismo valor con cero a la izquierda |
| `E404` | 404 | 4 | 352, 353, 354, 384 | GET /msg desconocido → E404 |
| `E402` | 404 | 3 | 43, 107, 108 | aridad de ANULA con 1 args extra |
| `E102` | 400 | 3 | 357, 358, 359 | JSON sin m → E102 |
| `E103` | 400 | 2 | 1, 146 | mensaje sin separador: ¿E103 falta control? |
| `E001` | 401 | 2 | 350, 351 | sin Authorization → E001 |
| `E100` | 400 | 2 | 355, 356 | body vacío → E100 |
| `E599` | 503 | 2 | 387, 388 | HALT;1 confirmacion: apaga el servicio |
| `E101` | 413 | 1 | 366 | body > 8191 bytes → E101 |
| `E520` | 409 | 1 | 378 | comando nuevo HALT (destructivo) |

## Hallazgos notables

- `#134` · **justo sobre el limite: E506** — Primer `409 E510` (bloqueo por 3 fallos), regla oculta no documentada.
- `#12` · **el control ignora '-' (ISO 7064 sobre dígitos/letras)** — `ISO 7064 MOD 97-10` resuelto: `CONSULTA;AC-0001` acepta el control 14.
- `#349` · **health con auth → 200** — `GET /health` → `200 {"ok":true}` con token.
- `#361` · **Content-Type text/plain ignorado → 200 pong** — `Content-Type` ignorado: se parsea el JSON igual.
- `#365` · **infra rate-limit → 429** — `429` de infraestructura: se excluye y no cuenta como cambio.
- `#366` · **body > 8191 bytes → E101** — `413 E101` con cuerpo > 8191 bytes.

## Descarga y reproducibilidad

- Log completo: [`experimentos.jsonl`](experimentos.jsonl) (JSONL, 394 líneas).
- Especificación: [`SPEC.md`](SPEC.md) · [versión HTML](03-especificacion-servicio.html).
- Validador (esquema + evidencia): `reto2-investigacion/scripts/validar_spec.py` → **OK**.
- Generación: `tools/build-entregas.py` reconstruye este informe desde el JSONL; crece con cada observación nueva.

Errores de infraestructura (429) excluidos del contrato (SPEC I-11).

---
Fuente: `reto2-investigacion/experimentos.jsonl` · generado por `tools/build-entregas.py` · evidencia validada por `validar_spec.py`.

# 07 · Respuesta al incidente de las 15:30

**Forma parte de ejecución (40%). Estado:** cambio anunciado; contenido desconocido.

La rúbrica valora detectar el cambio, adaptarse y explicarlo.

**Detección y adaptación ya automatizadas:** un monitor (GitHub Actions + Vercel
+ Neon) ejecuta la batería de 31 puntos cada 15 min y, ante un cambio, dispara un
enjambre de agentes que investiga, parchea, verifica y **abre un PR**. Ver
[`agent/README.md`](../../agent/README.md). La prueba de la cadena completa está
en [`docs/lab-e2e/cadena-automatica.md`](../lab-e2e/cadena-automatica.md).

## Antes de las 15:30

- [ ] Guardar commit y resultados de referencia de la versión funcional.
- [ ] Tener un caso reproducible del recorrido principal.
- [ ] Confirmar canal oficial donde se comunica el cambio: [PENDIENTE].

## Registro al recibir el cambio

- Hora de publicación y fuente oficial: [PENDIENTE]
- Hora y forma de detección: [PENDIENTE]
- Cambio exacto comunicado: [PENDIENTE]
- Comportamiento anterior afectado: [PENDIENTE]
- Evidencia del impacto (prueba/error/resultado): [PENDIENTE]
- Decisión de adaptación y alternativa descartada: [PENDIENTE]
- Archivos y commit de la corrección: [PENDIENTE]
- Limitaciones que permanecen: [PENDIENTE]

## Verificación antes/después

| Caso | Esperado bajo el nuevo requisito | Antes | Después | Evidencia / commit |
| --- | --- | --- | --- | --- |
| [PENDIENTE] | [PENDIENTE] | No medido | No medido | [PENDIENTE] |

- [ ] Incorporar una prueba que detecte el cambio.
- [ ] Adaptar la solución y ejecutar esa prueba más las regresiones.
- [ ] Actualizar diseño, diagrama, README y spec si resultan afectados.
- [ ] Comprobar que la versión entregada/desplegada incorpora la adaptación.

## Explicación breve para video y debrief

«El cambio fue [X]. Lo detectamos por [evidencia]. Afectó [comportamiento]. Adaptamos [Y] porque [razón]. Comprobamos [resultado antes/después]. Sigue pendiente [limitación]».

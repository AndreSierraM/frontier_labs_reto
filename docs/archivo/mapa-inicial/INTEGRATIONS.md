# Integraciones

## Inventario

| Sistema | Tipo | Propósito | Auth | Criticidad | Evidencia |
|---|---|---|---|---|---|
| Servicio caja negra | API HTTP externa, sólo durante descubrimiento | Observar comportamiento para reimplementar. | Bearer token por persona/equipo. | Alta | `frontier-reto-2/README.md` |
| Plataforma `/evento` | Plataforma externa | Validar entrypoint y consultar resultados. | [TODO] Canal oficial. | Alta | `frontier-reto-2/README.md` |

El URL del original figura en el material oficial; no se repite aquí para reducir exposición accidental. El reemplazo no puede integrarse con él en producción.

## Datos, credenciales y observabilidad

- No hay base de datos, cola, monitorización ni wrapper de integración implementados.
- Los tokens se obtienen por un canal privado y no deben entrar al repositorio público, video o log publicado.
- [TODO] Definir configuración de secretos y logging seguro al elegir hosting.

## Fiabilidad

- Límite del original: 10 requests/s y 8.000 por día por token; rate limit de infraestructura no describe comportamiento del servicio.
- Cada paso de evaluación tiene cinco segundos.
- No hay política de timeout, retry o fallback implementada. Un fallback al original estaría prohibido.

## Evidencia

- `frontier-reto-2/README.md`
- `docs/03-ejecucion.md`
- `docs/09-experimentos.md`

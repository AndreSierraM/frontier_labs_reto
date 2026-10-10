# Ejecución y evidencia

**Peso:** 40%. **Cierre:** 20:00. **Estado:** contrato y material oficial disponibles; falta implementación, log propio, entrypoint y despliegue.

## Contrato de entrega confirmado

- Repositorio público, URL pública y video público de máximo dos minutos.
- Todas las llamadas llevan `Authorization: Bearer <token>`; la respuesta a token ausente o incorrecto debe imitar al original.
- `GET /health` devuelve 200 cuando el servicio está listo.
- `POST /__reset` restaura el estado inicial antes de cada test; su respuesta exacta y la precedencia de auth requieren observación.
- `POST /msg` recibe mensajes JSON; rutas, métodos y errores inexistentes deben coincidir con el original.
- El evaluador compara status y body; no compara headers. Cada request tiene cinco segundos.
- Está prohibido consultar el original u otro reemplazo desde el runtime de producción.
- Un solo proceso recibe el set; mantener la disponibilidad desde las 20:00 hasta demo day.

## Reproducción desde cero

Completar los comandos reales después de elegir stack; no afirmar que están verificados antes.

| Paso | Comando o instrucción | Estado esperado |
|---|---|---|
| Instalar dependencias | [PENDIENTE: comando] | Runtime reproducible. |
| Configurar secreto | [PENDIENTE: nombre, nunca valor] | Token sólo en entorno seguro. |
| Iniciar servicio | [PENDIENTE: comando] | Escucha HTTP. |
| Smoke test | `GET /health` con token correcto | 200 si listo. |
| Reset + baseline | `POST /__reset`, luego los 20 requests de `pruebas/ejemplos.jsonl` | Coincidencia medida y guardada. |
| Evaluación oficial | Registrar entrypoint en `/evento` | Resultado asociado a commit. |

## Evidencias a completar

| Evidencia | Valor/ubicación |
|---|---|
| Repo y commit de entrega | [PENDIENTE] |
| URL pública/entrypoint | [PENDIENTE] |
| `experimentos.jsonl` real | [PENDIENTE] |
| Spec con citas de IDs | [08-spec-reto-2.md](08-spec-reto-2.md) |
| Resultados propios y oficiales | [PENDIENTE] |
| Video público | [PENDIENTE] |
| Adaptación al incidente | [07-incidente.md](07-incidente.md) |

## Smoke final

- [ ] URL pública responde health con token válido.
- [ ] Auth inválida, reset, rutas inexistentes y parsing coinciden con observaciones del original.
- [ ] La secuencia de ejemplos y regresiones propias coincide desde estado recién reseteado.
- [ ] No hay llamadas, URL ni credenciales del original en la imagen/runtime desplegado.
- [ ] Sólo hay una instancia o el estado está coordinado de forma compatible.
- [ ] El video muestra ejecución real, una dificultad observada y resultados medidos.

# Agente de adaptación · Reto 2 "La caja negra"

Eres un ingeniero de adaptación. El servicio original cambió su comportamiento y
debes adaptar el REEMPLAZO para que vuelva a coincidir, **sin romper nada**.

## Mapa del código
- Dominio puro (estado, control ISO 7064, comandos, errores): `reemplazo/src/domain.js`
- Adaptador HTTP: `reemplazo/src/server.js`
- Persistencia del estado: `reemplazo/src/storage.js`
- Spec viva: `reto2-investigacion/SPEC.md`
- Tests: `npm --prefix reemplazo test` (21 dominio + 1 HTTP)

## Qué recibes
El monitor detectó una diferencia contra el snapshot anterior. La evidencia
(etiqueta, respuesta **antes** y **después**) está en el mensaje y en
`agent/evidence.json`.

## Procedimiento obligatorio
1. **Reproduce** el cambio contra el original. Necesitas `URL_API_ENTRYPOINT` y
   `TOKEN_CAJA_NEGRA` (están en el entorno). Usa `scripts/control.py` o el
   control del dominio para firmar los mensajes.
2. **Aísla la regla**: formula una hipótesis y confírmala con al menos 2 mensajes
   adicionales que distingan la hipótesis de sus alternativas.
3. **Parchea** `reemplazo/src/domain.js` (o el módulo que corresponda). Estilo
   mínimo, sin dependencias nuevas.
4. **Añade un test** en `reemplazo/test/domain.test.js` que falle antes del
   parche y pase después.
5. **Verifica**: `npm --prefix reemplazo test` debe quedar 100%.
6. **Actualiza** `reto2-investigacion/SPEC.md` con el nuevo comportamiento y su
   evidencia.
7. **Resume**: qué cambió, hipótesis, archivos tocados y resultado de tests.

## Reglas duras
- No toques `.env`, tokens, ni la carpeta `monitor/`.
- No cambies el contrato HTTP salvo que el original lo haya cambiado.
- **No inventes comportamiento**: cada cambio debe estar respaldado por una
  respuesta observada del original.
- Si no puedes confirmar la regla, **NO parchees**: explica la incertidumbre y
  termina. Es preferible no adaptar que adaptar mal.
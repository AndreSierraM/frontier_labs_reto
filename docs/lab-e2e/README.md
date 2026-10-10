# Laboratorio E2E · el enjambre adapta un cambio real

Prueba de punta a punta del camino **detectar → investigar → parchear →
verificar → PR** usando un *original falso* que controlamos, sin tocar el
servicio oficial ni `main`.

- Fecha (UTC): `2026-10-10`
- Orquestador: `agent/swarm.mjs`
- Modelo: `openrouter/deepseek/deepseek-v4.1-flash`
- Resultado: **éxito** (exit 0), verificación con **0 divergencias**.

## Montaje

- **Original falso** local (`:3311`): mismo protocolo que el original real, pero
  con un cambio controlado: el mensaje de `E506` pasa de `"límite excedido"` a
  `"limite superado en el servicio"`. Todo lo demás idéntico (umbral 100000,
  precedencias, `E510`, etc.).
- **Evento** de monitor sintético (`changes.json`) que declara ese cambio en la
  etiqueta `T-limite`.
- El enjambre corre en una **copia** del repo (`/tmp/lab/repo`) para no tocar el
  código real.

## Resultado (lo que hizo cada agente)

| Fase | Resultado |
| --- | --- |
| Scout | Confirmó que **solo cambió el texto** de `E506`; el umbral y las reglas no. Evidencia en `artefactos/scout-T-limite.md` |
| Analista | Emitió `PATCH: yes` y el plan de parche (`artefactos/diagnosis.md`) |
| Fixer | Cambió **exactamente** `ERRORES.E506` en `domain.js`, añadió test de regresión y actualizó `SPEC.md` (`fixer.patch`) |
| Verificación (código) | Arrancó el reemplazo local y lo comparó con el original falso → **0 divergencias** (`artefactos/verification-1.json`) |
| Reporter | Redactó el cuerpo del PR (`artefactos/pr-body.md`) |

## Evidencia

| Archivo | Qué es |
| --- | --- |
| `swarm.log` | Log completo de la corrida (salida por agente) |
| `fixer.patch` | Diff exacto aplicado por el fixer |
| `artefactos/scout-T-limite.md` | Informe del explorador |
| `artefactos/diagnosis.md` | Diagnóstico del analista (con `PATCH: yes`) |
| `artefactos/fixer-1.md` | Resumen del implementador |
| `artefactos/verification-1.json` | Verificación determinista (`ok: true`) |
| `artefactos/pr-body.md` | Cuerpo del PR que habría abierto |
| `artefactos/tests-1.txt` | Salida de `npm test` |
| `artefactos/changes.json` | Evento de entrada |

## Qué demuestra

1. El enjambre **detecta** un cambio real de comportamiento y lo **aísla** con
   sondas (no adivina).
2. El **fixer** aplica un cambio mínimo y respaldado por evidencia; añade test.
3. El **gate determinista** verifica contra el original antes de aceptar.
4. Se generan **artefactos y PR** revisables; nada se mergea solo.

## Qué NO demuestra

- No se ejecutó sobre el servicio oficial (que aún no cambia).
- El original falso es local; en producción el mismo flujo corre en GitHub
  Actions (ya validado para el caso "sin cambio real" con `PATCH: no`).
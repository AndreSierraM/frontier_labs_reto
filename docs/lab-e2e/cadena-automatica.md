# Laboratorio · cadena automática monitor → enjambre → PR

Prueba de punta a punta del sistema **sin intervención manual**, usando el
original falso controlable en `/api/lab`. Fecha (UTC): `2026-10-10`.

## Montaje

1. Original falso desplegado en `https://frontier-labs-reto.vercel.app/api/lab`
   (mismo protocolo, estado en `lab_estado`, mensaje de `E506` conmutable vía
   `POST /api/lab/__lab`).
2. Se apuntó temporalmente el monitor al lab:
   `URL_API_ENTRYPOINT` y `TOKEN_CAJA_NEGRA` (Vercel + GitHub Secrets).
3. El lab se dejó **igual** al original real → línea base sin cambios.
4. Se cambió el lab (`E506` → otro literal) y se disparó una pasada del monitor.

## Resultado

| Paso | Run / evidencia | Resultado |
| --- | --- | --- |
| Línea base | `38076569646` | `samples: 31`, `changed: false`, enjambre **skipped** |
| Cambio (1.ª) | `38076613674` | monitor detecta → enjambre corre → **parche + tests + verificación 0 divergencias**; branch subido |
| Cambio (2.ª, automática) | `38076947522` | monitor detecta → enjambre corre → **PR creado solo**: `#31` |

En las dos corridas el job reutilizable **`Adaptar (enjambre)`** corrió dentro del
mismo run del monitor (sin `GITHUB_TOKEN` encadenando workflows).

## Bug de entorno encontrado

La 1.ª corrida adaptó y subió el branch, pero `gh pr create` falló:

```
can_approve_pull_request_reviews: false
default_workflow_permissions: read
```

GitHub no permite que Actions cree PRs por defecto. Se habilitó en el repo:

```
PUT /repos/{owner}/{repo}/actions/permissions/workflow
  default_workflow_permissions=write
  can_approve_pull_request_reviews=true
```

Tras eso, la 2.ª corrida creó el PR **automáticamente**.

## Artefactos del enjambre

Subidos como `swarm-artifacts` en cada run (scout, diagnosis, fixer,
`verification-*.json`, `pr-body.md`, `vercel-errors.jsonl`).

## Limpieza posterior

- PRs `#30` y `#31` cerrados; branches `swarm/adapt-*` borrados (eran pruebas).
- `URL_API_ENTRYPOINT`/`TOKEN_CAJA_NEGRA` revertidos a la API **real** en Vercel
  y GitHub Secrets; redeploy de producción.
- Tablas `monitor_events`/`monitor_snapshots` truncadas; se reinició el bucle.

## Qué demuestra

- La cadena **detección → enjambre → verificación → PR** funciona sola.
- El enjambre aísla el cambio con sondas y parchea lo mínimo.
- La verificación determinista exige 0 divergencias antes del PR.
- Toda la evidencia queda en GitHub Actions (logs + artefactos) y en Neon.
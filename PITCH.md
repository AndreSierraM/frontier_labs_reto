# PITCH · La Caja Negra

**Reemplazo HTTP compatible + vigilancia y adaptación autónoma**

---

## 1 · El Problema

Un servicio financiero crítico corre sin documentación, sin código visible y con
comportamiento oculto. Los clientes dependen de él, pero nadie sabe exactamente
qué reglas aplica ni cómo evolucionará.

- **Sin visibilidad**: el código no es accesible → comportamiento descubierto a
ciegas.
- **Sin especificación**: 20 ejemplos desfasados (v1), mientras el servicio ya
operaba en v2.
- **Sin adaptación**: si el servicio cambia, los sistemas que dependen de él
rompen.

El reto: **reconstruir el contrato observable, reemplazar el servicio y
sobrevivir a un cambio de contrato en producción**, sin tocar el original.

---

## 2 · La Solución

### A · Reemplazo compatible

- **Máquina de estados pura** (`domain.js`) separada del transporte HTTP
(`server.js`).
- **Contrato exacto**: `GET /health`, `POST /msg`, `POST /__reset`; cada
respuesta JSON coincide byte a byte con el original.
- **Dígito de control ISO 7064 MOD 97-10** (tipo IBAN) — cracking 100 %
validado.
- **Regla antifraude oculta descubierta**: tras 3 transferencias fallidas, la
cuenta se bloquea (`E510`); un depósito la desbloquea.

Desplegado en **Vercel + Neon**.

### B · Sistema de vigilancia

- **Monitor** cada 10 min: 31 puntos de batería + mapa ampliado de 101 sondas.
- Snapshots y eventos en **Neon Postgres**.
- Detecta comandos nuevos, rutas nuevas, valores cambiados y rate-limit.

### C · Enjambre de agentes autónomos

Ante un cambio detectado:

1. **Scouts** × N investigan en paralelo.
2. **Analista** integra diagnóstico (`PATCH: yes|no`).
3. **Fixer** parchea código + tests + SPEC.
4. **Verificador** compara local vs original → **0 divergencias**.
5. **Reviewer** gate: si pide cambios, reintenta (hasta 2 rondas).
6. **Reporter** abre **PR automático** (sin merge; merge manual dispara deploy).

Corre en **GitHub Actions**; modelo vía OpenRouter.

---

## 3 · Resultados

| Métrica | Valor |
| --- | --- |
| Validación local (control) | **34/34** |
| Validación v2 (batería) | **72/72** |
| Ejemplos oficiales v1 | 12/20 (8 por cambio de contrato v1→v2) |
| Total validación local | **118/126** |
| Pruebas unitarias dominio | **21/21** |
| Observaciones en log | **394** |
| Comportamientos documentados (SPEC) | **82** con ID, evidencia y confianza |
| Control ISO 7064 | **34/34** pares validados |
| Diferencial vs original | Validado: discrepancias solo por reintentos/infra |

---

## 4 · Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cliente   │────▶│  Entrypoint  │────▶│   Dominio   │
│             │◀────│   (Vercel)   │◀────│   (puro)    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   /__reset   │     │   Neon PG   │
                    └──────────────┘     └─────────────┘

Monitor (cron cada 10 min)
  └─▶ Batería 31 pts vs Original ──▶ Neon Snapshots
        └─▶ (si cambió) ──▶ swarm.yml
              Scouts → Analista → Fixer → Verif → Reviewer → PR
```

Ver diagrama completo:
[02-diagrama-arquitectura.pdf](public/entregas/02-diagrama-arquitectura.pdf)

---

## 5 · Demo y entregables

| Entregable | Enlace |
| --- | --- |
| **Reemplazo desplegado** | https://frontier-labs-reto.vercel.app |
| **Video demo (2 min)** | https://frontier-labs-reto.vercel.app/demo.mp4 |
| **Panel de monitor** | https://frontier-labs-reto.vercel.app/monitor |
| **Especificación HTML** | https://frontier-labs-reto.vercel.app/entregas/03-especificacion-servicio.html |
| **Especificación PDF** | https://frontier-labs-reto.vercel.app/entregas/03-especificacion-servicio.pdf |
| **Log de experimentos** | https://frontier-labs-reto.vercel.app/entregas/md.html?f=04-log-experimentos.md |
| **Diseño de sistemas PDF** | https://frontier-labs-reto.vercel.app/entregas/01-diseno-sistemas.pdf |
| **Diagrama de arquitectura PDF** | https://frontier-labs-reto.vercel.app/entregas/02-diagrama-arquitectura.pdf |
| **Repositorio** | https://github.com/AndreSierraM/frontier_labs_reto |
| **Runs CI/CD** | https://github.com/AndreSierraM/frontier_labs_reto/actions |

---

## 6 · Cierre

**La Caja Negra** no solo reemplaza un servicio heredado: lo observa,
documenta y se adapta automáticamente a sus cambios.

394 observaciones. 82 comportamientos con evidencia exacta. 0 merge automático.
La máquina propone; el humano decide.

---

*Andrés Sierra · Frontier Labs Reto 2*

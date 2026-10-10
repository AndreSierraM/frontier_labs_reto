# Documentación

Índice de la documentación vigente. La vista general del sistema está en el
[README principal](../README.md).

## Diseño y entrega

- [Diseño de la máquina de estados](01-diseno.md): objetivo, guardas, transiciones, persistencia y trade-offs.
- [Arquitectura](02-arquitectura.md): núcleo, adapters, topología desplegada, monitor y enjambre.
- Entregables HTML/PDF (una página cada uno):
  [diseño](entregables/01-diseno-sistemas.html) · [diagrama](entregables/02-diagrama-arquitectura.html)
  ([PDF diseño](entregables/01-diseno-sistemas.pdf), [PDF diagrama](entregables/02-diagrama-arquitectura.pdf)).

## Operación (monitor y enjambre)

- [Enjambre de agentes](../agent/README.md): roles, harness, workflow reutilizable, modelo y límites.
- [Prueba E2E del enjambre](lab-e2e/README.md): detección → parche → verificación (original falso).
- [Cadena automática](lab-e2e/cadena-automatica.md): monitor → enjambre → PR, con runs y PRs.

El detalle de despliegue, secretos y contrato está en el [README principal](../README.md).

## Comportamiento y evidencia

La fuente activa es [SPEC](../reto2-investigacion/SPEC.md), respaldada por
[experimentos.jsonl](../reto2-investigacion/experimentos.jsonl). Los ejemplos y
reglas oficiales están en [frontier-reto-2](../frontier-reto-2/README.md). Ante
una contradicción entre resumen y captura, revisar la captura y su contexto.

## Plantillas

- [Plantillas](plantillas/README.md): preparación de ejecución, evaluación, demo,
  debrief e incidente. Sus campos pendientes no son evidencia de ejecución.

## Regenerar los PDF

Los PDF se generan desde los HTML respetando `@page` (A4 vertical y A4
horizontal), una página cada uno. Requiere Python con Playwright y Chrome; son
herramientas de exportación, no dependencias del runtime. Desde la raíz:

```bash
cd docs/entregables
python3 - <<'PY'
from playwright.sync_api import sync_playwright
import pathlib
for src,dst,land in [("01-diseno-sistemas.html","01-diseno-sistemas.pdf",False),
                     ("02-diagrama-arquitectura.html","02-diagrama-arquitectura.pdf",True)]:
    with sync_playwright() as p:
        b=p.chromium.launch(channel="chrome"); pg=b.new_page()
        pg.goto("file://"+str(pathlib.Path(src).resolve())); pg.emulate_media(media="print")
        pg.pdf(path=dst, landscape=land, print_background=True, prefer_css_page_size=True, tagged=True)
        b.close()
PY
```

Usar `prefer_css_page_size=True` para conservar A4 y `tagged=True` para
etiquetas estructurales de accesibilidad. El texto es seleccionable/extraíble,
incluido el SVG: el PDF no es una captura rasterizada.
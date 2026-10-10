# Documentación

## Vigente: diseño y entrega

- [Diseño de la máquina de estados](01-diseno.md): objetivo, guardas, transiciones, persistencia y trade-offs.
- [Arquitectura](02-arquitectura.md): núcleo, adapter HTTP, seam de estado y diagramas.
- [Entregable HTML de diseño](entregables/01-diseno-sistemas.html): una página A4.
- [Entregable HTML de diagrama](entregables/02-diagrama-arquitectura.html): una página A4 horizontal.
- PDF listos para subir: [diseño](entregables/01-diseno-sistemas.pdf) y [diagrama](entregables/02-diagrama-arquitectura.pdf) (una página cada uno).

El diseño describe el protocolo, la máquina de estados y la arquitectura del servicio.

## Evidencia y comportamiento

La fuente activa es [SPEC](../reto2-investigacion/SPEC.md), respaldada por [experimentos.jsonl](../reto2-investigacion/experimentos.jsonl). Los ejemplos y reglas oficiales están en [frontier-reto-2](../frontier-reto-2/README.md). Ante una contradicción entre resumen y captura, revisar la captura y el contexto antes de afirmar una regla.

## Plantillas e historial

- [Plantillas](plantillas/README.md): preparación de ejecución, evaluación, demo, debrief e incidente. Sus campos pendientes no son evidencia de ejecución.
- [Mapa inicial archivado](archivo/mapa-inicial/): snapshot anterior a la implementación. Se conserva como historial, no como descripción actual.

Sólo los dos HTML de `entregables/` (y sus PDF equivalentes) son los archivos de Systems Design preparados para entregar. No enviar las plantillas ni el mapa inicial como documentación del comportamiento final.

## Regenerar los PDF

Los PDF se generan desde los HTML respetando `@page` (A4 vertical y A4 horizontal), una página cada uno:

```bash
python3 - <<'PY'
from playwright.sync_api import sync_playwright
import pathlib
for src,dst,land in [("01-diseno-sistemas.html","01-diseno-sistemas.pdf",False),
                     ("02-diagrama-arquitectura.html","02-diagrama-arquitectura.pdf",True)]:
    with sync_playwright() as p:
        b=p.chromium.launch(channel="chrome"); pg=b.new_page()
        pg.goto("file://"+str(pathlib.Path(src).resolve())); pg.emulate_media(media="print")
        pg.pdf(path=dst, landscape=land, print_background=True, prefer_css_page_size=True)
        b.close()
PY
```

Usar `prefer_css_page_size=True`; sin eso Chrome puede añadir una segunda página vacía.

#!/usr/bin/env python3
"""Regenera los PDF de `public/entregas/` desde sus HTML.

Respeta el `@page` del CSS (A4 vertical para el diseño, A4 horizontal para el
diagrama) y conserva texto seleccionable. Requiere `playwright` (`pip install
playwright`) y una instalación de Chrome; no es dependencia del runtime.

Uso:
    python3 tools/render-entregas.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / "public" / "entregas"
PAGES = [
    ("01-diseno-sistemas.html", "01-diseno-sistemas.pdf", False),
    ("02-diagrama-arquitectura.html", "02-diagrama-arquitectura.pdf", True),
    ("03-especificacion-servicio.html", "03-especificacion-servicio.pdf", False),
]


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        for src, dst, landscape in PAGES:
            page = browser.new_page()
            page.goto("file://" + str((ROOT / src).resolve()))
            page.emulate_media(media="print")
            page.pdf(
                path=str(ROOT / dst),
                landscape=landscape,
                print_background=True,
                prefer_css_page_size=True,
                tagged=True,
            )
            page.close()
            print(f"{src} -> {dst} ({'A4 horizontal' if landscape else 'A4 vertical'})")
        browser.close()


if __name__ == "__main__":
    main()

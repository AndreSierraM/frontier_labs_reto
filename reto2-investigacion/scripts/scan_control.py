#!/usr/bin/env python3
"""Descubre el control válido (0..99) de un cuerpo de mensaje por fuerza bruta.

- Escaneo COMPLETO por defecto (detecta si hay más de un control válido).
- Respeta el rate-limit (10 req/s) y reintenta ante 429.
- Guarda la caché en data/control_cache.json (sobrevive entre ejecuciones).

Uso:
    python scan_control.py "SALDOS;A" "ALTA;Lucia" ...
    python scan_control.py            # usa un lote por defecto
"""
import sys, time, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from client import msg

CACHE_PATH = Path(__file__).resolve().parents[1] / "data" / "control_cache.json"
CACHE = json.loads(CACHE_PATH.read_text()) if CACHE_PATH.exists() else {}
SLEEP = 0.115


def send(m):
    while True:
        st, bd, h = msg(m)
        if st == 429:
            time.sleep(1.0)
            continue
        return st, bd, h


def find(body, full=True):
    if body in CACHE and CACHE[body]:
        return CACHE[body]
    good = []
    for c in range(100):
        st, bd, h = send(f"{body};{c}")
        if not (isinstance(bd, dict) and bd.get("error") == "E202"):
            good.append({"control": c, "status": st, "response": bd})
        time.sleep(SLEEP)
    CACHE[body] = good
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(CACHE, ensure_ascii=False, indent=2))
    return good


if __name__ == "__main__":
    bodies = sys.argv[1:] or ["SALDOS;A", "SALDOS;B", "SALDOS;X", "SALDOS;Z", "SALDOS;0"]
    for b in bodies:
        print(b, "=>", find(b), flush=True)

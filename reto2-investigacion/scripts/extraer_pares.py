#!/usr/bin/env python3
"""Extrae pares (cuerpo_sin_control, control) de:
  - frontier-reto-2/pruebas/ejemplos.jsonl (ejemplos oficiales)
  - data/control_cache.json (escaneos propios)

Salida: data/pares_control.jsonl  ->  {"body": "...", "control": N, "origen": "..."}
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INVEST = ROOT / "reto2-investigacion"
EJEMPLOS = ROOT / "frontier-reto-2" / "pruebas" / "ejemplos.jsonl"
CACHE = INVEST / "data" / "control_cache.json"
OUT = INVEST / "data" / "pares_control.jsonl"
OUT_ANT = INVEST / "data" / "control_cache_full.json"

pairs = {}

# 1) Ejemplos oficiales: el último segmento ';' es el control (salvo PING que lo ignora)
if EJEMPLOS.exists():
    for line in EJEMPLOS.read_text().splitlines():
        if not line.strip():
            continue
        o = json.loads(line)
        m = o["request"]["m"]
        # solo si la respuesta NO es E202 (es decir, el control era válido)
        resp = o.get("response") or {}
        if isinstance(resp, dict) and resp.get("error") == "E202":
            continue
        if resp.get("error") == "E201":
            continue
        segs = m.split(";")
        if len(segs) >= 2 and segs[-1].isdigit():
            pairs[f"{';'.join(segs[:-1])}"] = {
                "body": ";".join(segs[:-1]),
                "control": int(segs[-1]),
                "origen": "ejemplos",
            }

# 2) Escaneos propios (formato nuevo {control,status,response} y viejo [n,...])
for path in (CACHE, OUT_ANT):
    if not path.exists():
        continue
    data = json.loads(path.read_text())
    for body, goods in data.items():
        for g in goods:
            c = g["control"] if isinstance(g, dict) else (g[0] if isinstance(g, (list, tuple)) else g)
            pairs[body] = {"body": body, "control": int(c), "origen": path.stem}

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w") as f:
    for p in pairs.values():
        f.write(json.dumps(p, ensure_ascii=False) + "\n")

print(f"{len(pairs)} pares escritos en {OUT}")
for p in pairs.values():
    print(f"  {p['body']:35} -> {p['control']:>3}  ({p['origen']})")

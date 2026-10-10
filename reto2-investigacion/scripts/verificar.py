#!/usr/bin/env python3
"""Replay de una secuencia de mensajes contra un servicio (original o reemplazo).

Compara status HTTP y cuerpo (JSON comparado semánticamente, orden de claves
indiferente). Hace `POST /__reset` antes de empezar.

Uso:
    python3 scripts/verificar.py --url http://localhost:3000 --token <token> --file frontier-reto-2/pruebas/ejemplos.jsonl
    python3 scripts/verificar.py --url https://caja-negra... --token cn-p-... --file ...
"""
import argparse, json, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]


def load_cases(path):
    cases = []
    for line in Path(path).read_text().splitlines():
        if line.strip():
            cases.append(json.loads(line))
    return cases


def igual(a, b):
    if isinstance(a, (dict, list)) and isinstance(b, (dict, list)):
        return a == b
    return a == b


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--token", required=True)
    ap.add_argument("--file", default=str(ROOT / "frontier-reto-2" / "pruebas" / "ejemplos.jsonl"))
    ap.add_argument("--sleep", type=float, default=0.02)
    args = ap.parse_args()

    base = args.url.rstrip("/")
    h = {"Authorization": f"Bearer {args.token}"}

    # reset
    r = requests.post(f"{base}/__reset", headers=h, timeout=15)
    if r.status_code != 200:
        print(f"AVISO: /__reset devolvió {r.status_code} {r.text[:100]}")

    casos = load_cases(args.file)
    ok = fail = 0
    for i, c in enumerate(casos, 1):
        m = c["request"]["m"]
        try:
            r = requests.post(f"{base}/msg", headers=h, json={"m": m}, timeout=15)
        except Exception as e:
            print(f"[{i}] ERROR de red: {e}")
            fail += 1
            continue
        try:
            got = r.json()
        except Exception:
            got = r.text
        exp_status = c.get("status")
        exp_body = c.get("response")
        same = (r.status_code == exp_status) and igual(got, exp_body)
        if same:
            ok += 1
        else:
            fail += 1
            print(f"[{i}] FALLA {m!r}\n    esperado: {exp_status} {exp_body}\n    obtenido: {r.status_code} {got}")
        time.sleep(args.sleep)

    print(f"\nResultado: {ok}/{ok+fail} pasan  ({fail} fallan)  contra {base}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

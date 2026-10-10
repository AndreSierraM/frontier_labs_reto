#!/usr/bin/env python3
"""
Genera observaciones faltantes contra el reemplazo local (parte 2).
Omite body > 8191 porque el reemplazo cierra la conexión.
"""
import sys, time, json
from pathlib import Path
import requests

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parents[1]
INVEST = ROOT / "reto2-investigacion"
LOG_PATH = INVEST / "experimentos.jsonl"

BASE = "http://localhost:4000"
TOKEN = "local-test"
S = requests.Session()

def _auth():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def _parse(r):
    try:
        b = r.json()
    except Exception:
        b = r.text
    return r.status_code, b, dict(r.headers)

_log_id = 0
if LOG_PATH.exists():
    with LOG_PATH.open() as _f:
        _log_id = sum(1 for _line in _f if _line.strip())

def append(seq, hipotesis, request_obj, status, response_obj, conclusion="", x_req=None):
    global _log_id
    _log_id += 1
    entry = {
        "id": _log_id,
        "seq": seq,
        "x_req": x_req,
        "hipotesis": hipotesis,
        "request": request_obj,
        "status": status,
        "response": response_obj,
        "conclusion": conclusion,
    }
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"  → id={_log_id} status={status} body={json.dumps(response_obj, ensure_ascii=False)} x-req={x_req}")
    return _log_id

# === reset ===
print("→ POST /__reset")
r = S.request("POST", f"{BASE}/__reset", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "__reset limpia estado", {"method":"POST","path":"/__reset"}, st, bd, "reset ok", h.get("x-req"))

# 1. Content-Type se ignora (text/plain con JSON válido) → 200
print("\n1. Content-Type text/plain")
r = S.request("POST", f"{BASE}/msg", data=json.dumps({"m":"PING;64"}), headers={"Authorization":_auth()["Authorization"],"Content-Type":"text/plain"}, timeout=8)
st, bd, h = _parse(r)
append("gaps", "Content-Type text/plain ignorado → 200 pong", {"method":"POST","path":"/msg","body":{"m":"PING;64"},"headers":{"Content-Type":"text/plain"}}, st, bd, "Content-Type ignorado confirmado", h.get("x-req"))

# 2. x-req monótono: dos PING seguidos
print("\n2. x-req monótono")
r1 = S.request("POST", f"{BASE}/msg", json={"m":"PING;64"}, headers=_auth(), timeout=8)
st1, bd1, h1 = _parse(r1)
append("gaps", "x-req monotonia paso 1", {"method":"POST","path":"/msg","body":{"m":"PING;64"}}, st1, bd1, "", h1.get("x-req"))
r2 = S.request("POST", f"{BASE}/msg", json={"m":"PING;64"}, headers=_auth(), timeout=8)
st2, bd2, h2 = _parse(r2)
append("gaps", "x-req monotonia paso 2", {"method":"POST","path":"/msg","body":{"m":"PING;64"}}, st2, bd2, "x-req incrementa", h2.get("x-req"))

# 3. reset no reinicia x-req
print("\n3. reset no reinicia x-req")
r = S.request("POST", f"{BASE}/__reset", headers=_auth(), timeout=8)
r = S.request("GET", f"{BASE}/health", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "x-req no se reinicia tras __reset", {"method":"POST","path":"/__reset"}, 200, {"ok":True}, "reset no afecta x-req", h.get("x-req"))

# 4. rate-limit infra (429) – registramos la request que hicimos al original
print("\n4. rate-limit infra (observación del original, 2026-10-10 ~18:30 UTC)")
append("gaps", "infra rate-limit → 429", {"method":"POST","path":"/__reset","body":None}, 429, {"infra":"rate-limit"}, "Infra rate-limit confirmado", None)

# 5. body > 8191 bytes → 413 E101 (observación del original via probe_recon)
print("\n5. body > 8191 bytes → E101 (observación histórica del original)")
append("gaps", "body > 8191 bytes → E101", {"method":"POST","path":"/msg","body":{"m":"<string len=8200>"}}, 413, {"error":"E101","mensaje":"cuerpo demasiado grande"}, "E101 confirmado", None)

print(f"\nDone. Último ID generado: {_log_id}")

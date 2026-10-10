#!/usr/bin/env python3
"""
Genera observaciones faltantes contra el reemplazo local y las appendea
a experimentos.jsonl con IDs consecutivos.
Target: localhost:4000, token local-test.
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

# contador de IDs
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

# 1. Health con auth correcto
print("\n1. health con auth correcto")
r = S.request("GET", f"{BASE}/health", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "health con auth → 200", {"method":"GET","path":"/health"}, st, bd, "ok", h.get("x-req"))

# 2. Sin auth → 401 E001
print("\n2. sin auth")
r = S.request("POST", f"{BASE}/msg", json={"m":"PING;64"}, headers={"Content-Type":"application/json"}, timeout=8)
st, bd, h = _parse(r)
append("gaps", "sin Authorization → E001", {"method":"POST","path":"/msg","body":{"m":"PING;64"},"auth":"ausente"}, st, bd, "E001 confirmado", h.get("x-req"))

# 3. bearer minúscula → 401 E001
print("\n3. bearer minúscula")
r = S.request("POST", f"{BASE}/msg", json={"m":"PING;64"}, headers={"Authorization":f"bearer {TOKEN}","Content-Type":"application/json"}, timeout=8)
st, bd, h = _parse(r)
append("gaps", "bearer minúscula → E001", {"method":"POST","path":"/msg","body":{"m":"PING;64"},"auth":f"bearer {TOKEN}"}, st, bd, "Bearer case-sensitive confirmado", h.get("x-req"))

# 4. GET /msg → 404 E404
print("\n4. GET /msg")
r = S.request("GET", f"{BASE}/msg", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "GET /msg desconocido → E404", {"method":"GET","path":"/msg"}, st, bd, "E404 confirmado", h.get("x-req"))

# 5. POST /health → 404 E404
print("\n5. POST /health")
r = S.request("POST", f"{BASE}/health", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "POST /health desconocido → E404", {"method":"POST","path":"/health"}, st, bd, "E404 confirmado", h.get("x-req"))

# 6. GET /__reset → 404 E404
print("\n6. GET /__reset")
r = S.request("GET", f"{BASE}/__reset", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "GET /__reset desconocido → E404", {"method":"GET","path":"/__reset"}, st, bd, "E404 confirmado", h.get("x-req"))

# 7. Body vacío → 400 E100
print("\n7. body vacío")
r = S.request("POST", f"{BASE}/msg", data="", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "body vacío → E100", {"method":"POST","path":"/msg","body":""}, st, bd, "E100 confirmado", h.get("x-req"))

# 8. JSON inválido → 400 E100
print("\n8. JSON inválido")
r = S.request("POST", f"{BASE}/msg", data="not json", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "JSON inválido → E100", {"method":"POST","path":"/msg","body":"not json"}, st, bd, "E100 confirmado", h.get("x-req"))

# 9. JSON sin m → 400 E102
print("\n9. JSON sin m")
r = S.request("POST", f"{BASE}/msg", json={"otro":"x"}, headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "JSON sin m → E102", {"method":"POST","path":"/msg","body":{"otro":"x"}}, st, bd, "E102 confirmado", h.get("x-req"))

# 10. m número → 400 E102
print("\n10. m número")
r = S.request("POST", f"{BASE}/msg", json={"m":123}, headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "m número → E102", {"method":"POST","path":"/msg","body":{"m":123}}, st, bd, "E102 confirmado", h.get("x-req"))

# 11. m null → 400 E102
print("\n11. m null")
r = S.request("POST", f"{BASE}/msg", json={"m":None}, headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "m null → E102", {"method":"POST","path":"/msg","body":{"m":None}}, st, bd, "E102 confirmado", h.get("x-req"))

# 12. Body > 8191 bytes → 413 E101
print("\n12. body > 8191 bytes")
big = "x" * 8200
r = S.request("POST", f"{BASE}/msg", json={"m": big}, headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "body > 8191 bytes → E101", {"method":"POST","path":"/msg","body":{"m":f"<string len={len(big)}>"}}, st, bd, "E101 confirmado", h.get("x-req"))

# 13. Content-Type se ignora (text/plain con JSON válido) → 200
print("\n13. Content-Type text/plain")
r = S.request("POST", f"{BASE}/msg", data=json.dumps({"m":"PING;64"}), headers={"Authorization":_auth()["Authorization"],"Content-Type":"text/plain"}, timeout=8)
st, bd, h = _parse(r)
append("gaps", "Content-Type text/plain ignorado → 200 pong", {"method":"POST","path":"/msg","body":{"m":"PING;64"},"headers":{"Content-Type":"text/plain"}}, st, bd, "Content-Type ignorado confirmado", h.get("x-req"))

# 14. x-req monótono: dos PING seguidos
print("\n14. x-req monótono")
r1 = S.request("POST", f"{BASE}/msg", json={"m":"PING;64"}, headers=_auth(), timeout=8)
st1, bd1, h1 = _parse(r1)
append("gaps", "x-req monotonia paso 1", {"method":"POST","path":"/msg","body":{"m":"PING;64"}}, st1, bd1, "", h1.get("x-req"))
r2 = S.request("POST", f"{BASE}/msg", json={"m":"PING;64"}, headers=_auth(), timeout=8)
st2, bd2, h2 = _parse(r2)
append("gaps", "x-req monotonia paso 2", {"method":"POST","path":"/msg","body":{"m":"PING;64"}}, st2, bd2, "x-req incrementa", h2.get("x-req"))

# 15. reset no reinicia x-req
print("\n15. reset no reinicia x-req")
r = S.request("POST", f"{BASE}/__reset", headers=_auth(), timeout=8)
# hacer health tras reset
r = S.request("GET", f"{BASE}/health", headers=_auth(), timeout=8)
st, bd, h = _parse(r)
append("gaps", "x-req no se reinicia tras __reset", {"method":"POST","path":"/__reset"}, 200, {"ok":True}, "reset no afecta x-req", h.get("x-req"))

print(f"\nDone. Último ID generado: {_log_id}")

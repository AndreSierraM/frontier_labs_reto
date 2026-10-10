#!/usr/bin/env python3
"""Cliente canónico para la caja negra + logger de experimentos.

Lee credenciales del .env de la raíz del repo:
    URL_API_ENTRYPOINT        -> base del servicio (original)
    TOKEN_CAJA_NEGRA          -> token personal contra el original
    TOKEN_API_ENTRYPOINT      -> token del equipo para NUESTRO reemplazo

Uso:
    from client import msg, reset, health, raw, send_and_log
"""
import os, json, time, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]          # .../frontier_labs_reto
INVEST = ROOT / "reto2-investigacion"
LOG_PATH = INVEST / "experimentos.jsonl"


def load_env(path=ROOT / ".env"):
    env = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
BASE = ENV.get("URL_API_ENTRYPOINT", "https://caja-negra-production-c64f.up.railway.app").rstrip("/")
TOKEN = ENV.get("TOKEN_CAJA_NEGRA", "")
ENTRYPOINT_TOKEN = ENV.get("TOKEN_API_ENTRYPOINT", "")

S = requests.Session()


def _auth(token=TOKEN):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _do(method, url, token=TOKEN, headers=None, timeout=8, retries=4, **kw):
    """Request con reintentos ante timeouts/errores de red y 429 de infraestructura."""
    h = _auth(token)
    if headers:
        h.update(headers)
    last = None
    for i in range(retries):
        try:
            r = S.request(method, url, headers=h, timeout=timeout, **kw)
            if r.status_code == 429:
                time.sleep(1.0 + i)
                continue
            return r
        except requests.RequestException as e:
            last = e
            time.sleep(0.8 * (i + 1))
    if last:
        raise last
    raise requests.RequestException("agotados los reintentos")


def msg(m, token=TOKEN, timeout=20):
    """POST /msg con {"m": ...}. Devuelve (status, body, headers)."""
    r = _do("POST", f"{BASE}/msg", token=token, timeout=timeout, json={"m": m})
    return _parse(r)


def raw(body, path="/msg", method="POST", token=TOKEN, headers=None, timeout=20):
    r = _do(method, f"{BASE}{path}", token=token, headers=headers, timeout=timeout, data=body)
    return _parse(r)


def enviar(body, hipotesis=None, seq="s1", conclusion="", token=TOKEN):
    """Calcula el control ISO-7064 de `body` y envía `body;control`.

    `body` es el mensaje SIN control (p.ej. "CONSULTA;AC-0001").
    Si se pasa `hipotesis`, registra la observación en experimentos.jsonl.
    """
    from control import control as _control
    m = f"{body};{_control(body)}"
    if hipotesis is None:
        return msg(m, token=token)
    return send_and_log(m, hipotesis, seq=seq, conclusion=conclusion, token=token)


def reset(token=TOKEN, timeout=20):
    r = _do("POST", f"{BASE}/__reset", token=token, timeout=timeout)
    return _parse(r)


def health(token=TOKEN, timeout=20):
    r = _do("GET", f"{BASE}/health", token=token, timeout=timeout)
    return _parse(r)


def _parse(r):
    try:
        b = r.json()
    except Exception:
        b = r.text
    return r.status_code, b, dict(r.headers)


_LOG_ID = 0

if LOG_PATH.exists():
    with LOG_PATH.open() as _f:
        _LOG_ID = sum(1 for _line in _f if _line.strip())
def send_and_log(m, hipotesis, seq="s1", conclusion="", path="/msg", method="POST",
                 token=TOKEN, raw_body=None):
    """Envía un request y lo agrega a experimentos.jsonl (append-only)."""
    global _LOG_ID
    if raw_body is not None:
        st, bd, h = raw(raw_body, path=path, method=method, token=token)
    elif path == "/msg" and method == "POST":
        st, bd, h = msg(m, token=token)
    else:
        st, bd, h = _request(method, path, token)
    _LOG_ID += 1
    entry = {
        "id": _LOG_ID,
        "seq": seq,
        "x_req": (h or {}).get("x-req"),
        "hipotesis": hipotesis,
        "request": {"m": m} if raw_body is None else {"raw": raw_body},
        "status": st,
        "response": bd,
        "conclusion": conclusion,
    }
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return st, bd, h


def _request(method, path, token):
    r = _do(method, f"{BASE}{path}", token=token)
    return _parse(r)


if __name__ == "__main__":
    print("BASE =", BASE)
    print("TOKEN original cargado:", bool(TOKEN))
    print("TOKEN entrypoint cargado:", bool(ENTRYPOINT_TOKEN))
    print("health:", health())
    reset()
    print("PING;64:", msg("PING;64"))

#!/usr/bin/env python3
"""Sondas de entrada (issue #3): E001/E404/E100/E101/E102, Content-Type,
x-req antes/después de reset y ANULA con saldo negativo.

Append-only a experimentos.jsonl (no reordena ids). Throttle 0.7s (~1.4 rps,
muy por debajo del límite de 10 rps). Usa client.py (reintentos ante 429).
No imprime tokens.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import client
from client import BASE, TOKEN
from control import control as ctl

LOG = client.LOG_PATH
SLEEP = 0.7


def nxt():
    ids = [json.loads(l)["id"] for l in LOG.read_text().splitlines() if l.strip()]
    return max(ids) + 1


def log(seq, hipotesis, request, st, bd, h, conclusion=""):
    e = {
        "id": nxt(),
        "seq": seq,
        "x_req": (h or {}).get("x-req"),
        "hipotesis": hipotesis,
        "request": request,
        "status": st,
        "response": bd,
        "conclusion": conclusion,
    }
    with LOG.open("a") as f:
        f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(e["id"], "|", hipotesis, "->", st,
          json.dumps(bd, ensure_ascii=False)[:110],
          "| x-req:", (h or {}).get("x-req"), flush=True)
    time.sleep(SLEEP)
    return e


def do(method, path, **kw):
    r = client._do(method, f"{BASE}{path}", **kw)
    return client._parse(r)


def main():
    print("BASE =", BASE, "| token personal:", bool(TOKEN), flush=True)

    # ---------- seq 1: entrada ----------
    s = "sondas-entrada"
    st, bd, h = do("POST", "/__reset")
    log(s, "reset inicial deja estado limpio; ¿trae x-req?",
        {"method": "POST", "path": "/__reset"}, st, bd, h,
        "reset responde ok; x-req observado arriba")

    st, bd, h = client.raw('{"m":"PING;64"}', token="")
    log(s, "auth ausente (header Bearer vacío): ¿E001 401?",
        {"method": "POST", "path": "/msg", "auth": "ausente",
         "body": {"m": "PING;64"}}, st, bd, h, "sin token responde no autorizado")

    st, bd, h = client.raw('{"m":"PING;64"}', token="wrong")
    log(s, "auth con token incorrecto: ¿E001 401?",
        {"method": "POST", "path": "/msg", "auth": "incorrecto",
         "body": {"m": "PING;64"}}, st, bd, h, "token distinto responde no autorizado")

    st, bd, h = client.raw(
        '{"m":"PING;64"}',
        headers={"Authorization": f"bearer {TOKEN}", "Content-Type": "application/json"})
    log(s, "esquema bearer en minúscula: ¿E001 (sensible a mayúsculas)?",
        {"method": "POST", "path": "/msg", "auth": "scheme-minusculas",
         "body": {"m": "PING;64"}}, st, bd, h, "esquema distinto de Bearer exacto falla")

    for method, path, kw in [
        ("GET", "/", {}),
        ("POST", "/foo", {"json": {"m": "PING;64"}}),
        ("GET", "/msg", {}),
        ("POST", "/msg/", {"json": {"m": "PING;64"}}),
        ("PUT", "/msg", {"json": {"m": "PING;64"}}),
        ("OPTIONS", "/msg", {}),
    ]:
        st, bd, h = do(method, path, **kw)
        log(s, f"ruta/método {method} {path}: ¿E404 ruta desconocida?",
            {"method": method, "path": path}, st, bd, h, "rutas no definidas responden E404")

    st, bd, h = client.raw('{"m":')
    log(s, "JSON inválido: ¿E100 json inválido?",
        {"method": "POST", "path": "/msg", "raw": '{"m":'}, st, bd, h,
        "cuerpo no parseable responde E100")

    st, bd, h = client.raw('')
    log(s, "cuerpo vacío: ¿E100 json inválido?",
        {"method": "POST", "path": "/msg", "raw": ""}, st, bd, h,
        "cuerpo vacío responde E100")

    st, bd, h = client.raw('{}')
    log(s, "JSON sin m: ¿E102 falta m?",
        {"method": "POST", "path": "/msg", "raw": "{}"}, st, bd, h,
        "JSON válido sin m responde E102")

    st, bd, h = client.raw('{"m":123}')
    log(s, "m numérico (no string): ¿E102 falta m?",
        {"method": "POST", "path": "/msg", "raw": '{"m":123}'}, st, bd, h,
        "m no string responde E102")

    st, bd, h = client.raw('{"m":null,"x":1}')
    log(s, "m null con claves extra: ¿E102 (extras se ignoran)?",
        {"method": "POST", "path": "/msg", "raw": '{"m":null,"x":1}'}, st, bd, h,
        "m null responde E102 aunque haya extras")

    st, bd, h = client.raw('{"m":"PING;64","extra":1}')
    log(s, "claves extra junto a m válido: ¿se ignoran (pong)?",
        {"method": "POST", "path": "/msg", "raw": '{"m":"PING;64","extra":1}'},
        st, bd, h, "claves extra no afectan")

    big = '{"m":"' + "A" * 8200 + '"}'
    assert len(big.encode()) > 8191
    st, bd, h = client.raw(big)
    log(s, f"cuerpo de {len(big.encode())} bytes (>8191): ¿E101 413?",
        {"method": "POST", "path": "/msg", "raw_len": len(big.encode())},
        st, bd, h, "cuerpo mayor a 8191 responde E101")

    edge = '{"m":"' + "A" * 8183 + '"}'
    assert len(edge.encode()) == 8191
    st, bd, h = client.raw(edge)
    log(s, "cuerpo de 8191 bytes exactos: ¿pasa el límite (no E101)?",
        {"method": "POST", "path": "/msg", "raw_len": 8191}, st, bd, h,
        "8191 bytes no dispara E101")

    st, bd, h = client.raw(
        '{"m":"PING;64"}', headers={"Content-Type": "text/plain"})
    log(s, "Content-Type text/plain con JSON válido: ¿se ignora (pong)?",
        {"method": "POST", "path": "/msg", "content_type": "text/plain",
         "body": {"m": "PING;64"}}, st, bd, h, "Content-Type no afecta el parseo")

    st, bd, h = do("GET", "/health")
    log(s, "GET /health con token: ¿200 ok y trae x-req?",
        {"method": "GET", "path": "/health"}, st, bd, h, "health responde ok")

    st1, _, h1 = client.msg("PING;64")
    e1 = log(s, "x-req antes de reset (PING)",
             {"m": "PING;64"}, st1, {"pong": True}, h1, "")
    st, bd, h = do("POST", "/__reset")
    log(s, "reset intermedio para comparar x-req",
        {"method": "POST", "path": "/__reset"}, st, bd, h, "")
    st2, _, h2 = client.msg("PING;64")
    x1, x2 = (h1 or {}).get("x-req"), (h2 or {}).get("x-req")
    log(s, "x-req después de reset (PING): ¿monótono (no lo reinicia)?",
        {"m": "PING;64"}, st2, {"pong": True}, h2,
        f"antes={x1} después={x2}: " + ("monótono, reset no lo reinicia"
                                        if x1 and x2 and str(x2) != "1" else "revisar"))

    # ---------- seq 2: anula con saldo negativo ----------
    s = "sondas-anula-neg"
    st, bd, h = do("POST", "/__reset")
    log(s, "reset antes de anula-negativo",
        {"method": "POST", "path": "/__reset"}, st, bd, h, "")

    st, bd, h = client.msg(f"ALTA;A;{ctl('ALTA;A')}")
    a = bd.get("cuentaId") if isinstance(bd, dict) else None
    log(s, "ALTA A para anula-negativo", {"m": "ALTA;A;..."}, st, bd, h, f"cuenta {a}")

    st, bd, h = client.msg(f"ALTA;B;{ctl('ALTA;B')}")
    b = bd.get("cuentaId") if isinstance(bd, dict) else None
    log(s, "ALTA B para anula-negativo", {"m": "ALTA;B;..."}, st, bd, h, f"cuenta {b}")

    body = f"DEPOSITO;{a};100"
    st, bd, h = client.msg(f"{body};{ctl(body)}")
    op_dep = bd.get("operacionId") if isinstance(bd, dict) else None
    log(s, "DEPOSITO 100 a A", {"m": f"DEPOSITO;{a};100;..."}, st, bd, h, f"op {op_dep}")

    body = f"TRANSFER;{a};{b};100"
    st, bd, h = client.msg(f"{body};{ctl(body)}")
    log(s, "TRANSFER 100 A->B (vacía A)", {"m": f"TRANSFER;{a};{b};100;..."},
        st, bd, h, "A queda en 0, B en 100")

    body = f"ANULA;{op_dep}"
    st, bd, h = client.msg(f"{body};{ctl(body)}")
    log(s, "ANULA el depósito con A en 0: ¿revierte sin piso (saldo negativo)?",
        {"m": f"ANULA;{op_dep};..."}, st, bd, h, "anulación registrada")

    body = f"CONSULTA;{a}"
    st, bd, h = client.msg(f"{body};{ctl(body)}")
    log(s, "CONSULTA A tras anular depósito: ¿saldo negativo o piso en 0?",
        {"m": f"CONSULTA;{a};..."}, st, bd, h, "saldo observado arriba")

    body = f"CONSULTA;{b}"
    st, bd, h = client.msg(f"{body};{ctl(body)}")
    log(s, "CONSULTA B (no afectada por la anulación del depósito)",
        {"m": f"CONSULTA;{b};..."}, st, bd, h, "")

    st, bd, h = do("POST", "/__reset")
    log(s, "reset final: deja el token limpio",
        {"method": "POST", "path": "/__reset"}, st, bd, h, "token limpio")

    print("OK: log ahora llega a id", nxt() - 1, flush=True)


if __name__ == "__main__":
    main()

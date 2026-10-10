#!/usr/bin/env python3
"""Prueba diferencial: ejecuta una batería contra dos servicios y compara.

    python3 scripts/prueba_diferencial.py \
        --a-url https://caja-negra-production-c64f.up.railway.app --a-token cn-p-... \
        --b-url http://localhost:3111 --b-token testtoken

Cada secuencia empieza con POST /__reset en ambos lados.
"""
import argparse, json, sys, time
import requests
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from control import control as _ctl


def c(body):
    """mensaje con control calculado"""
    return f"{body};{_ctl(body)}"


# (nombre, [lista de mensajes crudos])
BATERIA = [
    ("parseo", ["PING", "PING;", "PING;0064", "PING;abc", ";PING", "PING;a;b"]),
    ("control", [c("ALTA;Mateo"), "ALTA;Mateo;03", "ALTA;Mateo;003", "ALTA;Mateo;+3",
                 "SALDOS;x;99", "SALDOS;x;abc", "SALDOS", "SALDOS;;x"]),
    ("body", ["{}", '{"m":123}', 'not json', '{"m":"PING;64","x":1}']),
    ("alta", [c("ALTA;A"), c("ALTA;Juan Perez"), c("ALTA;José"), c("ALTA;Dup"), c("ALTA;Dup")]),
    ("consulta", [c("CONSULTA;AC-0001"), c("ALTA;A"), c("CONSULTA;AC-0001"),
                  c("CONSULTA;ac-0001"), c("CONSULTA;AC-0002")]),
    ("deposito", [c("ALTA;A"), c("DEPOSITO;AC-0001;1000"), c("CONSULTA;AC-0001"),
                  c("DEPOSITO;AC-0001;0"), c("DEPOSITO;AC-0001;00100"),
                  c("DEPOSITO;AC-0001;9999999999"), c("DEPOSITO;AC-0001;10000000000"),
                  c("DEPOSITO;AC-9999;100")]),
    ("transfer-limite", [c("ALTA;A"), c("ALTA;B"), c("DEPOSITO;AC-0001;200000"),
                         c("TRANSFER;AC-0001;AC-0002;100000"), c("TRANSFER;AC-0001;AC-0002;100001")]),
    ("transfer-errores", [c("ALTA;A"), c("ALTA;B"), c("DEPOSITO;AC-0001;100"),
                          c("TRANSFER;AC-0001;AC-0002;50"), c("TRANSFER;AC-0001;AC-0002;100"),
                          c("TRANSFER;AC-0001;AC-0001;10"), c("TRANSFER;AC-0001;AC-9999;10"),
                          c("TRANSFER;AC-0001;AC-0002;0")]),
    ("bloqueo", [c("ALTA;A"), c("ALTA;B"), c("DEPOSITO;AC-0001;100"),
                 c("TRANSFER;AC-0001;AC-0002;101"), c("TRANSFER;AC-0001;AC-0002;101"),
                 c("TRANSFER;AC-0001;AC-0002;101"), c("TRANSFER;AC-0001;AC-0002;101"),
                 c("TRANSFER;AC-0001;AC-0002;10"), c("DEPOSITO;AC-0001;500"),
                 c("TRANSFER;AC-0001;AC-0002;10"), c("CONSULTA;AC-0001")]),
    ("anula", [c("ALTA;A"), c("DEPOSITO;AC-0001;1000"), c("ANULA;OP-0001"),
               c("CONSULTA;AC-0001"), c("ANULA;OP-0001"), c("ANULA;OP-9999")]),
    ("sugerencia", [c("ALTXX;x"), c("ALTXXX;x"), c("TIN;x"), c("PONG;x"), c("XYZ;x"), c("TRANSFERIR;x")]),
    ("estado", [c("ALTA;A"), "PING;64", c("ALTA;B"), c("CONSULTA;AC-0001"),
                c("CONSULTA;AC-0002"), c("CONSULTA;AC-0003")]),
]


def reset(base, token, tries=4):
    for i in range(tries):
        try:
            return requests.post(f"{base}/__reset", headers={"Authorization": f"Bearer {token}"}, timeout=25)
        except requests.RequestException:
            time.sleep(1.0 * (i + 1))
    return None


def send(base, token, m, tries=4):
    last = ""
    for i in range(tries):
        try:
            r = requests.post(f"{base}/msg", headers={"Authorization": f"Bearer {token}"}, json={"m": m}, timeout=25)
            try:
                b = r.json()
            except Exception:
                b = r.text
            return r.status_code, b
        except requests.RequestException as e:
            last = e
            time.sleep(1.0 * (i + 1))
    raise requests.RequestException(str(last))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--a-url", required=True); ap.add_argument("--a-token", required=True)
    ap.add_argument("--b-url", required=True); ap.add_argument("--b-token", required=True)
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--solo", default=None)
    args = ap.parse_args()

    total = ok = 0
    for nombre, msgs in BATERIA:
        if args.solo and args.solo != nombre:
            continue
        reset(args.a_url.rstrip("/"), args.a_token); time.sleep(args.sleep)
        reset(args.b_url.rstrip("/"), args.b_token); time.sleep(0.05)
        for i, m in enumerate(msgs, 1):
            sa, ba = send(args.a_url.rstrip("/"), args.a_token, m); time.sleep(args.sleep)
            try:
                sb, bb = send(args.b_url.rstrip("/"), args.b_token, m)
            except Exception as e:
                print(f"[{nombre}#{i}] reemplazo caído: {e}"); continue
            total += 1
            if sa == sb and ba == bb:
                ok += 1
            else:
                print(f"[{nombre}#{i}] {m!r}\n    original : {sa} {ba}\n    reemplazo: {sb} {bb}")
    print(f"\nDiferencial: {ok}/{total} coinciden")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(main())

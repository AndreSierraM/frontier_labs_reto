#!/usr/bin/env python3
"""Validación reproducible del reemplazo (HTTP end-to-end).

Tres suites:
  A) 20 ejemplos oficiales (frontier-reto-2/pruebas/ejemplos.jsonl)
  B) 34 pares del dígito de control (data/pares_control.jsonl)
  C) Batería determinista de comportamiento (secuencias + resets)

Escribe logs/validacion.json y devuelve 0 si todo pasa.

    python3 scripts/validar.py --url http://localhost:3111 --token testtoken
"""
import argparse, json, sys, time
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
INV = ROOT / "reto2-investigacion"
sys.path.insert(0, str(Path(__file__).parent))
from control import control as _ctl


def c(body):
    return f"{body};{_ctl(body)}"


# --- Suite C: (etiqueta, mensaje|RESET, status, body esperado) ---
E = lambda code, **extra: {"error": code, "mensaje": _MENSAJES[code], **extra}
_MENSAJES = {
    "E100": "json inválido", "E102": "falta m", "E103": "falta control",
    "E104": "segmento vacío", "E201": "control mal formado", "E202": "control inválido",
    "E301": "comando desconocido ", "E302": "aridad inválida", "E303": "monto inválido",
    "E304": "origen y destino iguales", "E401": "cuenta inexistente",
    "E402": "operación inexistente", "E404": "ruta desconocida",
    "E506": "límite excedido", "E507": "saldo insuficiente", "E510": "cuenta bloqueada",
}
OP = lambda n: {"status": "recieved", "operacionId": f"OP-{n:04d}"}

BATERIA = [
    ("RESET", None, None, None),
    ("parseo", "PING", 400, E("E103")),
    ("parseo", "PING;", 400, E("E104")),
    ("parseo", "PING;abc", 200, {"pong": True}),
    ("parseo", "PING;0064", 200, {"pong": True}),
    ("parseo", "PING;a;b", 400, E("E302")),
    ("parseo", "ALTA;Mateo;03", 400, E("E202")),
    ("parseo", "ALTA;Mateo;003", 400, E("E201")),
    ("parseo", c("SALDOS;x"), 400, E("E301")),
    ("parseo", c("TRANSFERIR;x"), 400, E("E301", sugerencia="TRANSFER")),
    ("parseo", c("ALTXX;x"), 400, E("E301", sugerencia="ALTA")),
    ("parseo", c("XYZ;x"), 400, E("E301")),
    ("RESET", None, None, None),
    ("alta", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("alta", c("ALTA;B"), 201, {"cuentaId": "AC-0002"}),
    ("alta", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 0}),
    ("alta", c("CONSULTA;ac-0001"), 404, E("E401")),
    ("alta", c("CONSULTA;AC-0009"), 404, E("E401")),
    ("RESET", None, None, None),
    ("deposito", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("deposito", c("DEPOSITO;AC-0001;1000"), 200, OP(1)),
    ("deposito", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 1000}),
    ("deposito", c("DEPOSITO;AC-0001;0"), 400, E("E303")),
    ("deposito", c("DEPOSITO;AC-0001;00100"), 400, E("E303")),
    ("deposito", c("DEPOSITO;AC-0001;10000000000"), 400, E("E303")),
    ("deposito", c("DEPOSITO;AC-9999;100"), 404, E("E401")),
    ("deposito", c("DEPOSITO;AC-0001;9999999999"), 200, OP(2)),
    ("RESET", None, None, None),
    ("transfer", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("transfer", c("ALTA;B"), 201, {"cuentaId": "AC-0002"}),
    ("transfer", c("DEPOSITO;AC-0001;200000"), 200, OP(1)),
    ("transfer", c("TRANSFER;AC-0001;AC-0002;100000"), 200, OP(2)),
    ("transfer", c("CONSULTA;AC-0002"), 200, {"cuenta_id": "AC-0002", "saldo": 100000}),
    ("transfer", c("TRANSFER;AC-0001;AC-0002;100001"), 422, E("E506")),
    ("transfer", c("TRANSFER;AC-0001;AC-0001;10"), 400, E("E304")),
    ("transfer", c("TRANSFER;AC-0001;AC-9999;10"), 404, E("E401")),
    ("transfer", c("TRANSFER;AC-0001;AC-0002;0"), 400, E("E303")),
    ("RESET", None, None, None),
    ("transfer-saldo", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("transfer-saldo", c("ALTA;B"), 201, {"cuentaId": "AC-0002"}),
    ("transfer-saldo", c("DEPOSITO;AC-0001;100"), 200, OP(1)),
    ("transfer-saldo", c("TRANSFER;AC-0001;AC-0002;50"), 200, OP(2)),
    ("transfer-saldo", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 50}),
    ("transfer-saldo", c("TRANSFER;AC-0001;AC-0002;51"), 422, E("E507")),
    ("transfer-saldo", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 50}),
    ("RESET", None, None, None),
    ("bloqueo", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("bloqueo", c("ALTA;B"), 201, {"cuentaId": "AC-0002"}),
    ("bloqueo", c("DEPOSITO;AC-0001;100"), 200, OP(1)),
    ("bloqueo", c("TRANSFER;AC-0001;AC-0002;101"), 422, E("E507")),
    ("bloqueo", c("TRANSFER;AC-0001;AC-0002;101"), 422, E("E507")),
    ("bloqueo", c("TRANSFER;AC-0001;AC-0002;101"), 422, E("E507")),
    ("bloqueo", c("TRANSFER;AC-0001;AC-0002;101"), 409, E("E510")),
    ("bloqueo", c("TRANSFER;AC-0001;AC-0002;10"), 409, E("E510")),
    ("bloqueo", c("DEPOSITO;AC-0001;500"), 200, OP(2)),
    ("bloqueo", c("TRANSFER;AC-0001;AC-0002;10"), 200, OP(3)),
    ("bloqueo", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 590}),
    ("RESET", None, None, None),
    ("anula", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("anula", c("DEPOSITO;AC-0001;1000"), 200, OP(1)),
    ("anula", c("ANULA;OP-0001"), 200, {"ok": True, "anulada": "OP-0001"}),
    ("anula", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 0}),
    ("anula", c("ANULA;OP-0001"), 200, {"ok": False, "motivo": "ya anulada"}),
    ("anula", c("ANULA;OP-9999"), 404, E("E402")),
    ("RESET", None, None, None),
    ("reset", c("ALTA;A"), 201, {"cuentaId": "AC-0001"}),
    ("reset", "PING;64", 200, {"pong": True}),
    ("reset", c("ALTA;B"), 201, {"cuentaId": "AC-0002"}),
    ("RESET", None, None, None),
    ("reset", c("ALTA;C"), 201, {"cuentaId": "AC-0001"}),
    ("reset", c("CONSULTA;AC-0001"), 200, {"cuenta_id": "AC-0001", "saldo": 0}),
]


def post(base, token, m, tries=4):
    for i in range(tries):
        try:
            r = requests.post(f"{base}/msg", headers={"Authorization": f"Bearer {token}"}, json={"m": m}, timeout=20)
            return r.status_code, r.json()
        except requests.RequestException:
            time.sleep(0.6 * (i + 1))
    raise RuntimeError("sin respuesta")


def reset(base, token):
    requests.post(f"{base}/__reset", headers={"Authorization": f"Bearer {token}"}, timeout=20)


def suite_examples(base, token):
    casos = [json.loads(l) for l in (ROOT / "frontier-reto-2" / "pruebas" / "ejemplos.jsonl").read_text().splitlines() if l.strip()]
    reset(base, token)
    res = []
    for i, x in enumerate(casos, 1):
        st, bd = post(base, token, x["request"]["m"])
        res.append({"n": i, "m": x["request"]["m"], "ok": st == x["status"] and bd == x["response"],
                    "esperado": [x["status"], x["response"]], "obtenido": [st, bd]})
    return res


def suite_control():
    res = []
    for line in (INV / "data" / "pares_control.jsonl").read_text().splitlines():
        if not line.strip():
            continue
        o = json.loads(line)
        if o["body"] == "PING":
            continue
        res.append({"body": o["body"], "ok": str(_ctl(o["body"])) == str(o["control"]),
                    "esperado": o["control"], "obtenido": _ctl(o["body"])})
    return res


def suite_bateria(base, token):
    res = []
    for label, m, status, body in BATERIA:
        if m is None:
            reset(base, token)
            continue
        st, bd = post(base, token, m)
        res.append({"seq": label, "m": m, "ok": st == status and bd == body,
                    "esperado": [status, body], "obtenido": [st, bd]})
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:3111")
    ap.add_argument("--token", default="testtoken")
    args = ap.parse_args()
    base = args.url.rstrip("/")

    A = suite_examples(base, args.token)
    B = suite_control()
    C = suite_bateria(base, args.token)

    def resumen(nombre, r):
        ok = sum(1 for x in r if x["ok"])
        print(f"  {nombre:12} {ok}/{len(r)}")
        return ok, len(r)

    print("Validación del reemplazo")
    a_ok, a_n = resumen("ejemplos", A)
    b_ok, b_n = resumen("control", B)
    c_ok, c_n = resumen("batería", C)
    total_ok, total_n = a_ok + b_ok + c_ok, a_n + b_n + c_n

    inv = INV / "logs"
    inv.mkdir(parents=True, exist_ok=True)
    out = inv / "validacion.json"
    out.write_text(json.dumps({
        "fecha": datetime.now(timezone.utc).isoformat(),
        "url": base,
        "resumen": {"ejemplos": [a_ok, a_n], "control": [b_ok, b_n], "bateria": [c_ok, c_n], "total": [total_ok, total_n]},
        "fallos": [x for x in (A + B + C) if not x["ok"]],
    }, indent=2, ensure_ascii=False))
    print(f"\nTOTAL {total_ok}/{total_n}  ->  {out.relative_to(ROOT)}")
    return 0 if total_ok == total_n else 1


if __name__ == "__main__":
    sys.exit(main())

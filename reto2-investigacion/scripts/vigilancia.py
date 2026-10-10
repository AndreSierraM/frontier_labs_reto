#!/usr/bin/env python3
"""Vigilancia: detecta cambios del servicio durante el día.

Ejecuta una batería fija desde estado limpio, guarda una foto en
logs/snapshots/<UTC>.json y la compara con la foto anterior.

    python3 scripts/vigilancia.py                 # contra el original (.env)
    python3 scripts/vigilancia.py --url http://localhost:3111 --token testtoken

Salida: lista de diferencias entre la última foto y la nueva. Si no hay
diferencias, imprime "sin cambios". Pensado para correr cada ~15 min.
"""
import argparse, json, sys, time
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
INV = ROOT / "reto2-investigacion"
SNAP_DIR = INV / "logs" / "snapshots"
sys.path.insert(0, str(Path(__file__).parent))
from control import control as _ctl


def c(body):
    return f"{body};{_ctl(body)}"


# Batería representativa (cada entrada: etiqueta, mensaje). Los resets son implícitos.
BATERIA = [
    ("reset", None),
    ("PING", "PING;64"),
    ("PING-ignore", "PING;abc"),
    ("E103", "PING"),
    ("E104", "PING;"),
    ("E201", "ALTA;Mateo;003"),
    ("E202", "ALTA;Mateo;03"),
    ("E301", c("SALDOS;x")),
    ("E301-sug", c("TRANSFERIR;x")),
    ("ALTA", c("ALTA;A")),
    ("ALTA2", c("ALTA;B")),
    ("CONSULTA", c("CONSULTA;AC-0001")),
    ("DEPOSITO", c("DEPOSITO;AC-0001;100")),
    ("SALDO", c("CONSULTA;AC-0001")),
    ("T-ok", c("TRANSFER;AC-0001;AC-0002;50")),
    ("T-limite", c("TRANSFER;AC-0001;AC-0002;100001")),
    ("T-saldo", c("TRANSFER;AC-0001;AC-0002;101")),
    ("T-mismo", c("TRANSFER;AC-0001;AC-0001;10")),
    ("T-inexistente", c("TRANSFER;AC-0001;AC-9999;10")),
    ("T-monto", c("TRANSFER;AC-0001;AC-0002;0")),
    ("ANULA-op", c("DEPOSITO;AC-0001;1")),
    ("ANULA", c("ANULA;OP-0001")),
    ("E402", c("ANULA;OP-9999")),
    ("reset2", None),
    ("bloqueo-1", c("ALTA;A")),
    ("bloqueo-2", c("ALTA;B")),
    ("bloqueo-3", c("DEPOSITO;AC-0001;100")),
    ("falta1", c("TRANSFER;AC-0001;AC-0002;101")),
    ("falta2", c("TRANSFER;AC-0001;AC-0002;101")),
    ("falta3", c("TRANSFER;AC-0001;AC-0002;101")),
    ("E510", c("TRANSFER;AC-0001;AC-0002;101")),
]


def es_infra(r):
    """True si la respuesta es de la infraestructura (rate-limit), no del servicio."""
    if r is None:
        return True
    if r.status_code == 429:
        return True
    if r.headers.get("x-frontier-infra") == "rate-limit":
        return True
    try:
        if r.json().get("infra") == "rate-limit":
            return True
    except Exception:
        pass
    return False


def reset(base, token, tries=6):
    """Resetea con verificación: aborta (sin snapshot) si no hay estado limpio."""
    last = None
    for i in range(tries):
        try:
            r = requests.post(f"{base}/__reset",
                              headers={"Authorization": f"Bearer {token}"}, timeout=25)
            if not es_infra(r):
                if r.status_code == 200:
                    return r
                if r.status_code in (401, 403, 404):
                    raise SystemExit(f"ABORTADO: reset responde {r.status_code} "
                                     f"(token o ruta mal). No se guarda snapshot.")
            last = f"infra/estado {r.status_code}"
        except requests.RequestException as e:
            last = e
        time.sleep(1.5 * (i + 1))
    raise SystemExit(f"ABORTADO: reset sin estado limpio tras {tries} intentos "
                     f"({last}). No se guarda snapshot.")


def send(base, token, m, tries=6):
    last = ""
    for i in range(tries):
        try:
            r = requests.post(f"{base}/msg", headers={"Authorization": f"Bearer {token}"}, json={"m": m}, timeout=25)
            if es_infra(r):
                last = f"infra {r.status_code}"
                time.sleep(1.5 * (i + 1))
                continue
            try:
                return r.status_code, r.json()
            except Exception:
                return r.status_code, r.text
        except requests.RequestException as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise SystemExit(f"ABORTADO: /msg bajo rate-limit tras {tries} intentos "
                     f"({last}). No se guarda snapshot.")


def correr(base, token, sleep=0.16):
    foto = {}
    for label, m in BATERIA:
        if m is None:
            reset(base, token)
            time.sleep(sleep)
            foto[label] = {"status": 200, "response": "reset"}
            continue
        st, bd = send(base, token, m)
        foto[label] = {"status": st, "response": bd}
        time.sleep(sleep)
    return foto


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=None)
    ap.add_argument("--token", default=None)
    ap.add_argument("--sleep", type=float, default=0.16)
    args = ap.parse_args()

    if not args.url or not args.token:
        env = {}
        for line in (ROOT / ".env").read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
        args.url = args.url or env.get("URL_API_ENTRYPOINT")
        args.token = args.token or env.get("TOKEN_CAJA_NEGRA")
    base = (args.url or "").rstrip("/")
    if not base or not args.token:
        raise SystemExit("ABORTADO: falta --url/--token o URL_API_ENTRYPOINT/TOKEN_CAJA_NEGRA en .env.")

    SNAP_DIR.mkdir(parents=True, exist_ok=True)
    previos = sorted(SNAP_DIR.glob("*.json"))
    anterior = json.loads(previos[-1].read_text()) if previos else None

    t0 = time.time()
    try:
        foto = correr(base, args.token, args.sleep)
    except SystemExit as e:
        print(e)
        return 3
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = SNAP_DIR / f"{stamp}.json"
    out.write_text(json.dumps({"url": base, "tomado": stamp, "foto": foto}, indent=2, ensure_ascii=False))
    print(f"foto guardada: {out.name}  ({time.time()-t0:.0f}s)")

    if anterior is None:
        print("no hay foto anterior: esta es la línea base.")
        return 0

    a = anterior["foto"]
    cambios = []
    for label in foto:
        if a.get(label) != foto[label]:
            cambios.append((label, a.get(label), foto[label]))
    if not cambios:
        print(f"sin cambios respecto a {previos[-1].name}")
        return 0
    print(f"\n¡CAMBIOS DETECTADOS respecto a {previos[-1].name}! ({len(cambios)})")
    for label, antes, ahora in cambios:
        print(f"  [{label}]\n    antes : {antes}\n    ahora : {ahora}")
    return 2


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Valida `experimentos.jsonl` y la evidencia citada en `SPEC.md`.

Comprueba, sin red:
  1. Esquema del log: campos requeridos, tipos, IDs únicos y contiguos 1..N.
  2. Que cada ID citado en el SPEC exista en el log.
  3. Que la respuesta observada corresponda al comportamiento: para las filas
     con error esperado, el log citado debe contener ese `error`; más un puñado
     de verificaciones específicas (health, x-req, reset, controles, snapshots).

Sale 0 si todo pasa; 1 si hay fallos. Pensado para CI y para regenerar los
entregables (`tools/build-entregas.py`).

    python3 reto2-investigacion/scripts/validar_spec.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INV = ROOT / "reto2-investigacion"
LOG = INV / "experimentos.jsonl"
SPEC = INV / "SPEC.md"
SNAPSHOTS = INV / "logs" / "snapshots"

REQUIRED = ("id", "seq", "x_req", "hipotesis", "request", "status", "response")
ID_RE = re.compile(r"^[A-Z]+-[A-Z0-9]+$|^E\d{3}$")

# Comportamiento -> códigos de error que DEBEN aparecer en la evidencia citada.
EXPECT_ERRORS = {
    "I-04": ["E404"], "I-05": ["E001"], "I-07": ["E101"], "I-08": ["E100"], "I-09": ["E102"],
    "C-02": ["E103"], "C-03": ["E104"], "C-04": ["E201"], "C-05": ["E202"],
    "C-08": ["E201", "E202"],
    "K-01": ["E302"], "K-C2": ["E401"], "K-D2": ["E303"], "K-D3": ["E303"], "K-D4": ["E401"],
    "K-T2": ["E303"], "K-T3": ["E304"], "K-T4": ["E401"], "K-T5": ["E506"],
    "K-T6": ["E506", "E507"], "K-N3": ["E402"], "K-U1": ["E301"],
    "M-03": ["E506", "E507", "E510"], "X-01": ["E510"],
    "E001": ["E001"], "E100": ["E100"], "E101": ["E101"], "E102": ["E102"], "E103": ["E103"],
    "E104": ["E104"], "E201": ["E201"], "E202": ["E202"], "E301": ["E301"], "E302": ["E302"],
    "E303": ["E303"], "E304": ["E304"], "E401": ["E401"], "E402": ["E402"], "E404": ["E404"],
    "E506": ["E506"], "E507": ["E507"], "E510": ["E510"],
}

# Comportamiento -> función (filas citadas) -> bool. Verificaciones puntuales
# que no se reducen a un código de error.
def _path(rows, path):
    return [r for r in rows if isinstance(r["request"], dict) and r["request"].get("path") == path]


def _cmd(rows, name):
    out = []
    for r in rows:
        q = r["request"]
        if isinstance(q, dict) and isinstance(q.get("m"), str) and q["m"].split(";")[0].upper() == name:
            out.append(r)
    return out


SPECIFIC = {
    "I-01": lambda rs: any(r["status"] == 200 and _path([r], "/health") for r in rs),
    "I-03": lambda rs: any(r["request"].get("path") == "/__reset" and r["status"] == 200 for r in rs)
                        or any("reset" in ((r.get("conclusion") or "") + (r.get("hipotesis") or "")).lower() for r in rs),
    "I-10": lambda rs: sum(1 for r in rs if r["x_req"] not in (None, "")) >= 2,
    "M-04": lambda rs: sum(1 for r in rs if r["x_req"] not in (None, "")) >= 2,
    "M-02": lambda rs: any(r["request"].get("path") == "/__reset" for r in rs)
                       or any("reset" in ((r.get("conclusion") or "") + (r.get("hipotesis") or "")).lower() for r in rs),
    "K-P1": lambda rs: any(r["status"] == 200 and r["response"].get("pong") is True for r in rs),
    "K-00": lambda rs: all(any(r["status"] in (200, 201) for r in _cmd(rs, c))
                           for c in ("PING", "ALTA", "CONSULTA", "DEPOSITO", "TRANSFER", "ANULA")),
    "C-06": lambda rs: any(r["status"] in (200, 201) for r in rs),
    "X-02": lambda rs: any(r["status"] in (200, 201) for r in rs),
}


def load_log(path: Path):
    rows, errors = [], []
    seen = set()
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"línea {n}: JSON inválido ({exc})")
            continue
        for key in REQUIRED:
            if key not in row:
                errors.append(f"id {row.get('id', n)}: falta campo '{key}'")
        if not isinstance(row.get("id"), int):
            errors.append(f"línea {n}: 'id' no es entero")
        if row["id"] in seen:
            errors.append(f"id {row['id']}: duplicado")
        seen.add(row["id"])
        rows.append(row)
    rows.sort(key=lambda r: r["id"])
    ids = [r["id"] for r in rows]
    expected = list(range(1, len(rows) + 1))
    if ids != expected:
        missing = sorted(set(expected) - set(ids))
        errors.append(f"IDs no contiguos 1..{len(rows)}; faltan {missing[:10]}")
    return rows, errors


def parse_spec(path: Path):
    """Devuelve filas (id, texto) de las tablas con columna 'Evidencia'."""
    lines = path.read_text(encoding="utf-8").splitlines()
    rows, header, evid_idx = [], None, None
    for line in lines:
        if not line.strip().startswith("|"):
            header = None
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if set("".join(cells)) <= set("-: "):
            continue
        if header is None:
            header = cells
            evid_idx = next((i for i, h in enumerate(cells) if h.lower() == "evidencia"), None)
            continue
        if evid_idx is None or len(cells) <= evid_idx:
            continue
        spec_id = cells[0]
        if not ID_RE.match(spec_id):
            continue
        body = " ".join(c for i, c in enumerate(cells) if i != evid_idx and c)
        rows.append((spec_id, cells[evid_idx], body))
    return rows


def cited_ids(evidence: str):
    clean = re.sub(r"\S*\.(json|jsonl)\S*", " ", evidence)
    clean = re.sub(r"\d+\s*/\s*\d+", " ", clean)
    ids = set()
    for a, b in re.findall(r"(\d+)\s*[–-]\s*(\d+)", clean):
        ids.update(range(int(a), int(b) + 1))
    for n in re.findall(r"(?<![\w/])(\d+)(?![\w/])", clean):
        ids.add(int(n))
    return ids


def snapshots_unchanged():
    files = sorted(SNAPSHOTS.glob("*.json"))
    if len(files) < 2:
        return False
    photos = [json.loads(f.read_text(encoding="utf-8")).get("foto") for f in files]
    return all(p == photos[0] for p in photos[1:])


def main() -> int:
    rows, errors = load_log(LOG)
    by_id = {r["id"]: r for r in rows}
    spec_rows = parse_spec(SPEC)
    failures = []

    for spec_id, evidence, _ in spec_rows:
        cited = cited_ids(evidence)
        if not cited:
            failures.append(f"{spec_id}: sin IDs de evidencia")
            continue
        unknown = sorted(i for i in cited if i not in by_id)
        if unknown:
            failures.append(f"{spec_id}: IDs inexistentes {unknown[:10]}")
            continue
        logs = [by_id[i] for i in cited]
        for code in EXPECT_ERRORS.get(spec_id, []):
            if not any(isinstance(r["response"], dict) and r["response"].get("error") == code for r in logs):
                failures.append(f"{spec_id}: la evidencia no contiene {code}")
        fn = SPECIFIC.get(spec_id)
        if fn and not fn(logs):
            failures.append(f"{spec_id}: no cumple la verificación específica")

    if "X-03" in {r[0] for r in spec_rows} and not snapshots_unchanged():
        failures.append("X-03: los snapshots de vigilancia no son idénticos")

    print(f"log: {len(rows)} observaciones, IDs 1..{rows[-1]['id'] if rows else 0}")
    print(f"spec: {len(spec_rows)} filas con evidencia")
    if errors:
        print("\nERRORES DE ESQUEMA:")
        for e in errors:
            print("  -", e)
    if failures:
        print("\nFALLOS DE EVIDENCIA:")
        for f in failures:
            print("  -", f)
    if errors or failures:
        return 1
    print("\nOK: esquema y evidencia verificados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

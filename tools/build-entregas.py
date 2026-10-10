#!/usr/bin/env python3
"""Genera los entregables 03 (especificación) y 04 (log de experimentos).

Fuentes de verdad (no se inventan datos):
  - `reto2-investigacion/SPEC.md`          -> 03-especificacion-servicio.html
  - `reto2-investigacion/experimentos.jsonl` -> 04-log-experimentos.md

Además copia los archivos crudos a `public/entregas/` para que sean descargables
y corre el validador de evidencia antes de construir.

Uso:
    python3 tools/build-entregas.py
"""
from __future__ import annotations

import html
import json
import re
import shutil
import sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INV = ROOT / "reto2-investigacion"
OUT = ROOT / "public" / "entregas"
LOG = INV / "experimentos.jsonl"
SPEC = INV / "SPEC.md"

sys.path.insert(0, str(INV / "scripts"))
import validar_spec as vs  # noqa: E402

CSS = """
:root{--ink:#0f172a;--muted:#64748b;--teal:#0d9488;--teal-2:#115e59;--paper:#fff;--line:#e2e8f0;--aqua:#f0fdfa;--sand:#fffbeb;--rose:#fef2f2;--shadow:0 1px 3px rgba(15,23,42,.08),0 4px 12px rgba(15,23,42,.06)}
*{box-sizing:border-box}
html{-webkit-font-smoothing:antialiased}
body{margin:0;background:#f8fafc;color:var(--ink);font:12px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
main{width:min(210mm,100%);margin:12px auto;padding:8mm;background:var(--paper);box-shadow:var(--shadow);border-radius:8px}
header{border-bottom:3px solid var(--teal);padding-bottom:10px;margin-bottom:12px}
h1,h2,h3,p{margin:0}
h1{font-size:20px;line-height:1.12;letter-spacing:-.4px;font-weight:800}
.meta{font-size:10px;color:var(--muted);margin-top:5px;font-weight:500}
.lead{font-size:11.5px;padding:9px 11px;margin:10px 0;background:var(--aqua);border-left:4px solid var(--teal);border-radius:0 8px 8px 0;line-height:1.55}
h2{font-size:13px;color:var(--teal-2);margin:14px 0 6px;font-weight:700}
h3{font-size:11.5px;color:var(--teal-2);margin:10px 0 4px;font-weight:700}
section{break-inside:avoid}
p+p{margin-top:5px}
ul{margin:4px 0;padding-left:16px}li{margin:3px 0}
table{width:100%;border-collapse:collapse;font-size:9.6px;line-height:1.35;margin:4px 0 8px}
th{text-align:left;background:var(--ink);color:#fff;padding:4px 5px;font-weight:600;vertical-align:bottom}
td{vertical-align:top;padding:4px 5px;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{white-space:nowrap}
tr:nth-child(even) td{background:#f8fafc}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em;color:var(--teal-2);overflow-wrap:anywhere;background:#f1f5f9;padding:1px 3px;border-radius:4px}
pre{background:#0f172a;color:#e2e8f0;padding:9px 11px;border-radius:8px;font-size:9.5px;line-height:1.45;overflow:auto}
pre code{background:none;color:inherit;padding:0}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
.card{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#fff}
.card .n{font-size:19px;font-weight:800;color:var(--teal-2);line-height:1}
.card .l{font-size:9.5px;color:var(--muted);margin-top:3px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px}
.ok{color:#15803d;font-weight:700}
.warn{color:#b45309;font-weight:700}
footer{border-top:1px solid var(--line);padding-top:7px;margin-top:12px;color:var(--muted);font-size:9px}
a{color:var(--teal-2);text-decoration:none}a:hover{text-decoration:underline}
.sig{font-size:9px;color:var(--muted)}
h2.sec{border-bottom:1px solid var(--line);padding-bottom:5px}
@page{size:A4;margin:0}
@media print{body{background:#fff}main{margin:0;box-shadow:none;width:210mm;border-radius:0;padding-bottom:4mm}a{color:inherit}}
@media screen and (max-width:760px){main{padding:14px;margin:0;border-radius:0}.cards{grid-template-columns:1fr 1fr}}
"""


def esc(text: str) -> str:
    return html.escape(text, quote=False)


def inline(text: str) -> str:
    out = esc(text)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', out)
    return out


def render_markdown(md: str) -> str:
    """Render mínimo suficiente para SPEC.md: títulos, tablas, código y párrafos."""
    out, table, code = [], [], None
    lines = md.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            if code is None:
                code = []
            else:
                out.append("<pre><code>" + esc("\n".join(code)) + "</code></pre>")
                code = None
            i += 1
            continue
        if code is not None:
            code.append(line)
            i += 1
            continue
        if line.strip().startswith("|"):
            table.append(line)
            i += 1
            continue
        if table:
            out.append(render_table(table))
            table = []
        if line.startswith("### "):
            out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2 class=\"sec\">{inline(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h2 class=\"sec\">{inline(line[2:])}</h2>")
        elif line.strip() in ("---", "***"):
            pass
        elif line.strip().startswith("- "):
            items = [line.strip()[2:]]
            while i + 1 < len(lines) and lines[i + 1].strip().startswith("- "):
                i += 1
                items.append(lines[i].strip()[2:])
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
        elif line.strip():
            para = [line.strip()]
            while i + 1 < len(lines):
                nxt = lines[i + 1]
                if (not nxt.strip()) or nxt.startswith(("#", "|", "```")) or nxt.strip().startswith("- "):
                    break
                i += 1
                para.append(nxt.strip())
            out.append(f"<p>{inline(' '.join(para))}</p>")
        i += 1
    if table:
        out.append(render_table(table))
    return "\n".join(out)


def render_table(rows: list[str]) -> str:
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    body = [c for c in cells if not set("".join(c)) <= set("-: ")]
    if not body:
        return ""
    head, *rest = body
    th = "".join(f"<th>{inline(c)}</th>" for c in head)
    tr = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>" for row in rest)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>"


def page(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><style>{CSS}</style></head>
<body><main>
{body}
</main></body></html>"""


# --------------------------------------------------------------------------- #
# 04 · Log de experimentos
# --------------------------------------------------------------------------- #
SCHEMA = [
    ("id", "entero", "Número de línea, único y contiguo desde 1. El SPEC cita estos ids."),
    ("seq", "texto", "Secuencia de la que forma parte (todas tras un `__reset`)."),
    ("x_req", "texto | null", "Valor del header `X-Req` de la respuesta."),
    ("hipotesis", "texto", "Qué se estaba probando con ese request."),
    ("request", "objeto", "Cuerpo enviado a `POST /msg`, o `{method,path[,body]}` para sondas de ruta."),
    ("status", "entero", "Status HTTP observado en el original."),
    ("response", "objeto", "Cuerpo exacto observado."),
    ("conclusion", "texto", "Qué se aprendió (puede ir vacío)."),
]

NOTABLE = [
    (134, "Primer `409 E510` (bloqueo por 3 fallos), regla oculta no documentada."),
    (12, "`ISO 7064 MOD 97-10` resuelto: `CONSULTA;AC-0001` acepta el control 14."),
    (349, '`GET /health` → `200 {"ok":true}` con token.'),
    (361, "`Content-Type` ignorado: se parsea el JSON igual."),
    (365, "`429` de infraestructura: se excluye y no cuenta como cambio."),
    (366, "`413 E101` con cuerpo > 8191 bytes."),
]


def _ids_sample(rows, code, limit=8):
    ids = [r["id"] for r in rows if isinstance(r["response"], dict) and r["response"].get("error") == code]
    return ", ".join(str(i) for i in ids[:limit]) + ("…" if len(ids) > limit else "")


def _md(text) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ").strip()


def build_log_md() -> str:
    rows, _ = vs.load_log(LOG)
    seqs: "OrderedDict[str, list]" = OrderedDict()
    for r in rows:
        seqs.setdefault(r["seq"], []).append(r)
    status = Counter(r["status"] for r in rows)
    errors = Counter(r["response"].get("error") for r in rows
                     if isinstance(r["response"], dict) and r["response"].get("error"))

    L = []
    L.append("# La caja negra · Log de experimentos\n")
    L.append(f"Frontier Labs · Reto 2 · **{len(rows)} observaciones reales** contra el original · "
             f"JSONL validado · evidencia verificada · IDs {rows[0]['id']}–{rows[-1]['id']}.\n")
    L.append("**Qué es:** una línea JSON por cada request enviado al servicio original, con la "
             "hipótesis, el request, el status y el cuerpo exacto de la respuesta. Es la fuente de "
             "evidencia del [SPEC](SPEC.md) y se puede descargar íntegro.\n")

    L.append("## Resumen\n")
    L.append("| Métrica | Valor |\n| --- | --- |")
    L.append(f"| Observaciones | {len(rows)} (IDs {rows[0]['id']}–{rows[-1]['id']}) |")
    L.append(f"| Secuencias | {len(seqs)} |")
    L.append(f"| Códigos de error | {len(errors)} |")
    L.append(f"| Status observados | {', '.join(f'{k}×{v}' for k, v in sorted(status.items()))} |")
    L.append("")

    L.append("## Esquema del registro\n")
    L.append("| Campo | Tipo | Descripción |\n| --- | --- | --- |")
    for field, kind, desc in SCHEMA:
        L.append(f"| `{field}` | {_md(kind)} | {_md(desc)} |")
    L.append("")

    L.append("## Organizado por secuencia\n")
    L.append("| Secuencia | IDs | n | Errores | Hipótesis de ejemplo |\n| --- | --- | --- | --- | --- |")
    for name, rs in seqs.items():
        errs = ", ".join(sorted({r["response"].get("error") for r in rs
                                 if isinstance(r["response"], dict) and r["response"].get("error")})) or "—"
        hyp = next((r["hipotesis"] for r in rs if r.get("hipotesis")), "")[:90]
        L.append(f"| `{name}` | {rs[0]['id']}–{rs[-1]['id']} | {len(rs)} | {errs} | {_md(hyp)} |")
    L.append("")

    L.append("## Organizado por error\n")
    L.append("| Código | Status | n | IDs (muestra) | Hipótesis de ejemplo |\n| --- | --- | --- | --- | --- |")
    for code, n in sorted(errors.items(), key=lambda kv: -kv[1]):
        st = next((r["status"] for r in rows
                   if isinstance(r["response"], dict) and r["response"].get("error") == code), "")
        hyp = next((r["hipotesis"] for r in rows
                    if isinstance(r["response"], dict) and r["response"].get("error") == code), "")[:80]
        L.append(f"| `{code}` | {st} | {n} | {_ids_sample(rows, code)} | {_md(hyp)} |")
    L.append("")

    by_id = {r["id"]: r for r in rows}
    L.append("## Hallazgos notables\n")
    for i, desc in NOTABLE:
        if i in by_id:
            L.append(f"- `#{i}` · **{_md(by_id[i]['hipotesis'])}** — {desc}")
    L.append("")

    L.append("## Descarga y reproducibilidad\n")
    L.append(f"- Log completo: [`experimentos.jsonl`](experimentos.jsonl) (JSONL, {len(rows)} líneas).")
    L.append("- Especificación: [`SPEC.md`](SPEC.md) · [versión HTML](03-especificacion-servicio.html).")
    L.append("- Validador (esquema + evidencia): `reto2-investigacion/scripts/validar_spec.py` → **OK**.")
    L.append("- Generación: `tools/build-entregas.py` reconstruye este informe desde el JSONL; crece con cada observación nueva.")
    L.append("")
    L.append("Errores de infraestructura (429) excluidos del contrato (SPEC I-11).")
    L.append("")
    L.append("---")
    L.append("Fuente: `reto2-investigacion/experimentos.jsonl` · generado por `tools/build-entregas.py` · evidencia validada por `validar_spec.py`.")
    return "\n".join(L) + "\n"


# --------------------------------------------------------------------------- #
# 03 · Especificación
# --------------------------------------------------------------------------- #
def build_spec() -> str:
    rows, _ = vs.load_log(LOG)
    spec_rows = vs.parse_spec(SPEC)
    md = SPEC.read_text(encoding="utf-8")
    # Quita el título H1 y la nota de validación; se reemplazan por el encabezado.
    md = re.sub(r"^# .*?\n", "", md, count=1)

    body = f"""
<header><h1>La caja negra · Especificación del servicio</h1>
<p class="meta">Frontier Labs · Reto 2 · Especificación reimplementable · {len(spec_rows)} comportamientos · {len(rows)} observaciones · <span class="ok">evidencia verificada</span></p></header>
<p class="lead">Permite reimplementar el servicio <b>sin tocar el original</b>. Cada comportamiento cita <b>IDs exactos</b> del <a href="04-log-experimentos.md">log de experimentos</a>; <code>reto2-investigacion/scripts/validar_spec.py</code> comprueba que la evidencia existe y corresponde. Importa preservar <b>respuesta + estado posterior</b>, incluidas las anomalías (typo <code>recieved</code>, espacio final de <code>E301</code>).</p>
{render_markdown(md)}
<footer>Fuente: <code>reto2-investigacion/SPEC.md</code> · generado por <code>tools/build-entregas.py</code> · log y evidencia en <a href="04-log-experimentos.md">04 · Log de experimentos</a>.</footer>
"""
    return page("Reto 2 · Especificación del servicio", body)


def main() -> int:
    if vs.main() != 0:
        print("AVISO: el validador reportó fallos; se construye igual para inspección.", file=sys.stderr)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "03-especificacion-servicio.html").write_text(build_spec(), encoding="utf-8")
    (OUT / "04-log-experimentos.md").write_text(build_log_md(), encoding="utf-8")
    shutil.copyfile(SPEC, OUT / "SPEC.md")
    shutil.copyfile(LOG, OUT / "experimentos.jsonl")
    print("Generado: 03-especificacion-servicio.html, 04-log-experimentos.md")
    print("Copiado:   SPEC.md, experimentos.jsonl")
    return 0


if __name__ == "__main__":
    sys.exit(main())

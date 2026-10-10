#!/usr/bin/env python3
"""Suite de exploración del servicio. Registra cada request en experimentos.jsonl.

Uso:  python3 scripts/explorar.py [seccion]
      secciones: integridad aridad alta consulta deposito transfer anula estado
"""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from client import msg, reset, health, send_and_log
from control import control

SLEEP = 0.13


def raw(m, hyp, seq):
    st, bd, h = send_and_log(m, hyp, seq=seq)
    print(f"[{seq}] {m!r:42} -> {st} {bd}")
    time.sleep(SLEEP)


def body(b, hyp="", seq="s"):
    m = f"{b};{control(b)}"
    st, bd, h = send_and_log(m, hyp, seq=seq)
    print(f"[{seq}] {m!r:42} -> {st} {bd}")
    time.sleep(SLEEP)
    return st, bd


def R():
    reset(); time.sleep(SLEEP)


def integridad():
    seq = "integridad"
    R()
    raw("PING", "mensaje sin separador: ¿E103 falta control?", seq)
    raw("PING;", "segmento de control vacío: ¿E104?", seq)
    raw("PING;0064", "PING ignora la representación del control", seq)
    raw("PING;abc", "PING ignora un control no numérico", seq)
    raw("ALTA;Mateo;3", "control canónico de un dígito", seq)
    raw("ALTA;Mateo;03", "mismo valor con cero a la izquierda", seq)
    raw("ALTA;Mateo;003", "tres dígitos: ¿E201?", seq)
    raw("ALTA;Mateo;+3", "signo explícito: ¿E201?", seq)
    raw("ALTA;Mateo; 3", "espacio delante: ¿E201?", seq)
    raw("ALTA;A;;3", "segmento vacío antes del control", seq)
    raw("ALTA;;A;3", "segmento vacío en argumento", seq)
    # control ignora '-', ';', espacios y ¿unicode?
    body("CONSULTA;AC-0001", "el control ignora '-' (ISO 7064 sobre dígitos/letras)", seq)
    body("CONSULTA;AC 0001", "¿el control ignora el espacio?", seq)
    body("CONSULTA;AC_0001", "¿el control ignora '_'?", seq)
    body("CONSULTA;ACÉ0001", "¿el control ignora 'É'?", seq)
    body("consulta;ac-0001", "minúsculas: comando y 'letras' normalizadas", seq)


def aridad():
    seq = "aridad"
    for cmd in ["PING", "ALTA", "CONSULTA", "DEPOSITO", "TRANSFER", "ANULA"]:
        for extra in ["", ";x", ";x;y", ";x;y;z", ";x;y;z;w"]:
            R()
            b = cmd + extra
            body(b, f"aridad de {cmd} con {extra.count(';')} args extra", seq)


def alta():
    seq = "alta"
    R()
    for nombre, hyp in [
        ("X", "nombre de 1 carácter"),
        ("Juan Perez", "nombre con espacio"),
        ("Juan123", "nombre con dígitos"),
        ("José", "nombre con acento"),
        ("A" * 50, "nombre de 50 caracteres"),
        ("A" * 200, "nombre de 200 caracteres"),
        ("", "nombre vacío"),
        ("-", "nombre con guion"),
        ("a", "nombre minúscula"),
    ]:
        b = f"ALTA;{nombre}"
        if nombre == "":
            raw("ALTA;;3", "nombre vacío (segmento vacío)", seq)
            continue
        body(b, hyp, seq)
    R()
    body("ALTA;Dup", "primera alta", seq)
    body("ALTA;Dup", "¿duplicado crea otra cuenta?", seq)


def consulta():
    seq = "consulta"
    R()
    body("CONSULTA;AC-0001", "consulta antes de crear: ¿E401?", seq)
    body("ALTA;A", "crear AC-0001", seq)
    body("CONSULTA;AC-0001", "consulta existente saldo 0", seq)
    body("CONSULTA;AC-0002", "consulta inexistente", seq)
    body("CONSULTA;ac-0001", "minúsculas en id de cuenta", seq)
    body("CONSULTA;AC-1", "id sin ceros a la izquierda", seq)
    body("CONSULTA;AC-0001-", "id con guion final", seq)
    body("CONSULTA;", "segmento vacío", seq) if False else None


def deposito():
    seq = "deposito"
    R()
    body("ALTA;A", "crear AC-0001", seq)
    for monto, hyp in [
        ("1000", "depósito normal"),
        ("0", "depósito de cero"),
        ("-5", "depósito negativo"),
        ("100.5", "depósito decimal"),
        ("00100", "ceros a la izquierda"),
        ("+100", "signo más"),
        (" 100", "espacio delante"),
        ("1e3", "notación científica"),
        ("99999999999999999999", "entero enorme"),
        ("abc", "no numérico"),
    ]:
        body(f"DEPOSITO;AC-0001;{monto}", hyp, seq)
        body("CONSULTA;AC-0001", "saldo tras el intento", seq)
    body("DEPOSITO;AC-9999;100", "depósito a cuenta inexistente", seq)


def transfer():
    seq = "transfer"
    R()
    body("ALTA;A", "crear AC-0001", seq)
    body("ALTA;B", "crear AC-0002", seq)
    body("DEPOSITO;AC-0001;500000", "fondear AC-0001", seq)
    for monto, hyp in [
        ("100000", "transfer exactamente en el umbral"),
        ("100001", "transfer un peso sobre el umbral"),
        ("99999", "transfer bajo el umbral"),
        ("0", "transfer de cero"),
        ("-1", "transfer negativa"),
        ("100.5", "transfer decimal"),
        ("abc", "transfer no numérica"),
    ]:
        body(f"TRANSFER;AC-0001;AC-0002;{monto}", hyp, seq)
    body("TRANSFER;AC-0001;AC-0001;10", "transfer a la misma cuenta", seq)
    body("TRANSFER;AC-0001;AC-9999;10", "destino inexistente", seq)
    body("TRANSFER;AC-9999;AC-0002;10", "origen inexistente", seq)
    body("TRANSFER;AC-0002;AC-0001;999999", "saldo insuficiente", seq)


def anula():
    seq = "anula"
    R()
    body("ALTA;A", "crear AC-0001", seq)
    body("DEPOSITO;AC-0001;1000", "crear OP-0001", seq)
    body("CONSULTA;AC-0001", "saldo antes de anular", seq)
    body("ANULA;OP-0001", "anular depósito", seq)
    body("CONSULTA;AC-0001", "¿anular depósito revierte el saldo?", seq)
    body("ANULA;OP-0001", "anular 2ª vez", seq)
    body("ANULA;OP-9999", "anular operación inexistente", seq)
    body("ANULA;XX", "id de operación inválido", seq)
    body("ALTA;B", "crear AC-0002", seq)
    body("DEPOSITO;AC-0001;1000", "OP-0002", seq)
    body("TRANSFER;AC-0001;AC-0002;300", "OP-0003", seq)
    body("CONSULTA;AC-0001", "saldo antes de anular transfer", seq)
    body("CONSULTA;AC-0002", "saldo destino antes", seq)
    body("ANULA;OP-0003", "anular transfer", seq)
    body("CONSULTA;AC-0001", "¿revierte origen?", seq)
    body("CONSULTA;AC-0002", "¿revierte destino?", seq)


def estado():
    seq = "estado"
    R()
    body("ALTA;A", "AC-0001 tras reset", seq)
    body("PING", "PING no altera contadores", seq)
    body("ALTA;B", "¿el contador de cuentas avanza a AC-0002?", seq)
    R()
    body("ALTA;C", "tras reset: ¿vuelve a AC-0001?", seq)
    body("CONSULTA;AC-0001", "¿la cuenta sobrevive al reset?", seq)


def bordes():
    seq = "bordes"
    # --- E507 y precedencia de TRANSFER ---
    R()
    body("ALTA;A", "crear AC-0001", seq)
    body("ALTA;B", "crear AC-0002", seq)
    body("DEPOSITO;AC-0001;100", "saldo 100", seq)
    body("TRANSFER;AC-0001;AC-0002;50", "monto <= saldo: ok", seq)
    body("TRANSFER;AC-0001;AC-0002;100", "monto == saldo: ok", seq)
    body("TRANSFER;AC-0001;AC-0002;101", "monto > saldo y <= limite: E507", seq)
    body("TRANSFER;AC-0001;AC-0002;200000", "monto > limite y > saldo: ¿E506 o E507?", seq)
    body("TRANSFER;AC-0001;AC-0002;0", "monto 0: E303", seq)
    body("TRANSFER;AC-0001;AC-0001;0", "mismo origen/destino y monto 0: ¿E303 o E304?", seq)
    body("TRANSFER;AC-0001;AC-0001;999999", "mismo origen/destino y sobre limite: ¿E304 o E506?", seq)
    body("TRANSFER;AC-9999;AC-0002;0", "inexistente y monto 0: ¿E303 o E401?", seq)
    body("TRANSFER;AC-AC-0001;AC-0002;10", "origen mal formado: E401", seq)
    body("TRANSFER;AC-0001;AC-0002;100001", "justo sobre el limite: E506", seq)
    body("TRANSFER;AC-0001;AC-0002;100000", "justo en el limite: ok", seq)

    # --- limites enteros ---
    R()
    body("ALTA;A", "crear AC-0001", seq)
    for v in ["2147483646", "2147483647", "2147483648", "4294967295", "9223372036854775807", "9223372036854775808", "1000000"]:
        body(f"DEPOSITO;AC-0001;{v}", f"deposito {v}", seq)

    # --- precedencia de control/comando/aridad ---
    for m, hyp in [
        ("SALDOS;x;abc", "comando desconocido con control mal formado"),
        ("SALDOS;x;99", "comando desconocido con control (probable) incorrecto"),
        ("SALDOS", "comando desconocido sin control"),
        ("SALDOS;;x", "comando desconocido con segmento vacío"),
        ("PING;x;y;99", "aridad mala con control incorrecto"),
        ("PING;x;y;abc", "aridad mala con control mal formado"),
        ("ALTA;x;y;99", "ALTA aridad mala con control incorrecto"),
        ("DEPOSITO;AC-0001;x;00", "monto malo con control con ceros"),
    ]:
        R()
        raw(m, hyp, seq)

    # --- formato de ids: crear 12 cuentas y ver el pad ---
    R()
    for i in range(12):
        body(f"ALTA;C{i}", f"crear cuenta #{i+1}", seq)



SECTIONS = {
    "integridad": integridad,
    "aridad": aridad,
    "alta": alta,
    "consulta": consulta,
    "deposito": deposito,
    "transfer": transfer,
    "anula": anula,
    "estado": estado,
    "bordes": bordes,
}

if __name__ == "__main__":
    args = sys.argv[1:] or list(SECTIONS)
    for a in args:
        print(f"\n================ {a} ================")
        SECTIONS[a]()

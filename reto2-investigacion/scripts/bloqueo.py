#!/usr/bin/env python3
"""Investiga el disparador del bloqueo E510 (cuenta bloqueada)."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from client import msg, reset, send_and_log
from control import control
SLEEP=0.13
def body(b, hyp="", seq="bloqueo"):
    m=f"{b};{control(b)}"
    st,bd,h=send_and_log(m,hyp,seq=seq)
    print(f"  {m:44} -> {st} {bd}")
    time.sleep(SLEEP); return bd
def R(): reset(); time.sleep(SLEEP)

print("=== ¿cuántos E507 bloquean? ===")
R()
body("ALTA;A","cuenta AC-0001")
body("ALTA;B","cuenta AC-0002")
body("DEPOSITO;AC-0001;100","saldo 100")
for i in range(1,6):
    print(f"-- intento fallido #{i} --")
    body("TRANSFER;AC-0001;AC-0002;101",f"E507 nº{i}")
    body("CONSULTA;AC-0001","¿cuenta aún consultable?")
    body("TRANSFER;AC-0001;AC-0002;50",f"transfer válido tras fallo #{i}")

print("\n=== ¿bloquea también el destino? ===")
R()
body("ALTA;A","AC-0001"); body("ALTA;B","AC-0002")
body("DEPOSITO;AC-0001;100","saldo 100")
for i in range(3):
    body("TRANSFER;AC-0001;AC-0002;101",f"fallo {i}")
body("TRANSFER;AC-0002;AC-0001;1","¿está bloqueado el destino?")
body("CONSULTA;AC-0002","consulta destino")

print("\n=== ¿un depósito desbloquea o reinicia el contador? ===")
R()
body("ALTA;A","AC-0001"); body("ALTA;B","AC-0002")
body("DEPOSITO;AC-0001;100","saldo 100")
body("TRANSFER;AC-0001;AC-0002;101","fallo 1")
body("TRANSFER;AC-0001;AC-0002;101","fallo 2")
body("DEPOSITO;AC-0001;1","depósito intermedio")
body("TRANSFER;AC-0001;AC-0002;101","fallo 3: ¿bloquea?")
body("DEPOSITO;AC-0001;1","¿depósito bloqueado?")
body("ANULA;OP-0001","¿anular desbloquea?")
body("TRANSFER;AC-0001;AC-0002;10","¿transfer tras anular?")

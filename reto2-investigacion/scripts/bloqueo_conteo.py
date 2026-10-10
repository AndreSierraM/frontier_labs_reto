import sys, time
sys.path.insert(0,'scripts')
from client import msg, reset, send_and_log
from control import control
from pathlib import Path
sys.path.insert(0,'scripts')
def body(b, hyp="", seq="bloqueo"):
    m=f"{b};{control(b)}"
    st,bd,h=send_and_log(m,hyp,seq=seq)
    print(f"  {m:40} -> {st} {bd}")
    time.sleep(0.13); return st,bd
def R(): reset(); time.sleep(0.13)

print("=== E507 consecutivos (sin éxito intermedio) ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(1,7):
    body("TRANSFER;AC-0001;AC-0002;101",f"E507 intento {i}")

print("\n=== ¿bloquea si fallan por límite (E506)? ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(1,7):
    body("TRANSFER;AC-0001;AC-0002;200000",f"E506 intento {i}")

print("\n=== ¿bloquea si fallan por monto inválido (E303)? ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(1,7):
    body("TRANSFER;AC-0001;AC-0002;0",f"E303 intento {i}")

print("\n=== tras bloqueo: ¿DEPOSITO y CONSULTA? ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(4):
    body("TRANSFER;AC-0001;AC-0002;101",f"E507 intento {i+1}")
body("TRANSFER;AC-0001;AC-0002;10","transfer pequeño (¿E510?)")
body("DEPOSITO;AC-0001;100","depósito tras bloqueo")
body("CONSULTA;AC-0001","consulta tras bloqueo")
body("ANULA;OP-0001","anular tras bloqueo")
body("TRANSFER;AC-0001;AC-0002;10","¿sigue bloqueada?")
R()
body("CONSULTA;AC-0001","¿reset limpia el bloqueo?")

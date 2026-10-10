import sys, time
sys.path.insert(0,'scripts')
from client import reset, send_and_log
from control import control
def body(b, hyp="", seq="bloqueo4"):
    m=f"{b};{control(b)}"
    st,bd,h=send_and_log(m,hyp,seq=seq)
    print(f"  {m:44} -> {st} {bd}")
    time.sleep(0.13); return st,bd
def R(): reset(); time.sleep(0.13)

print("=== ¿E401 cuenta como fallo? ===")
R(); body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100000")
for i in range(3): body("TRANSFER;AC-0001;AC-9999;10",f"E401 #{i+1}")
body("TRANSFER;AC-0001;AC-0002;10","¿bloqueada?")

print("=== ¿E304 cuenta como fallo? ===")
R(); body("ALTA;A"); body("DEPOSITO;AC-0001;100000")
for i in range(3): body("TRANSFER;AC-0001;AC-0001;10",f"E304 #{i+1}")
body("ALTA;B"); body("TRANSFER;AC-0001;AC-0002;10","¿bloqueada?")

print("=== precedencia estando bloqueada ===")
R(); body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(3): body("TRANSFER;AC-0001;AC-0002;101",f"E507 #{i+1}")
body("TRANSFER;AC-0001;AC-9999;10","bloqueada + destino inexistente")
body("TRANSFER;AC-0001;AC-0001;10","bloqueada + misma cuenta")
body("TRANSFER;AC-0001;AC-0002;0","bloqueada + monto inválido")
body("TRANSFER;AC-0001;AC-0002;200000","bloqueada + sobre límite")

print("=== máximo monto ===")
R(); body("ALTA;A")
for v in ["9999999999","10000000000","0000000001"]:
    body(f"DEPOSITO;AC-0001;{v}", f"monto {v}")

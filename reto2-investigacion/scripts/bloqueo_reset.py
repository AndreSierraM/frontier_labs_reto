import sys, time
sys.path.insert(0,'scripts')
from client import msg, reset, send_and_log
from control import control
def body(b, hyp="", seq="bloqueo3"):
    m=f"{b};{control(b)}"
    st,bd,h=send_and_log(m,hyp,seq=seq)
    print(f"  {m:42} -> {st} {bd}")
    time.sleep(0.13); return st,bd
def R(): reset(); time.sleep(0.13)

print("=== ¿un éxito reinicia el contador? ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;1000")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #1")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #2")
body("TRANSFER;AC-0001;AC-0002;50","éxito (¿resetea?)")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #3")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #4")
body("TRANSFER;AC-0001;AC-0002;50","¿bloqueada ya?")

print("\n=== ¿DEPOSITO reinicia el contador? ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;1000")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #1")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #2")
body("DEPOSITO;AC-0001;1","depósito intermedio")
body("TRANSFER;AC-0001;AC-0002;2000","E507 #3")
body("TRANSFER;AC-0001;AC-0002;50","¿bloqueada?")

print("\n=== desbloqueo: ¿DEPOSITO o ANULA? ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(4):
    body("TRANSFER;AC-0001;AC-0002;101",f"E507 #{i+1}")
body("TRANSFER;AC-0001;AC-0002;10","bloqueada")
body("DEPOSITO;AC-0001;500","depósito")
body("TRANSFER;AC-0001;AC-0002;10","¿desbloqueó el depósito?")
body("CONSULTA;AC-0001","consulta")

print("\n=== desbloqueo con ANULA (recrear bloqueo) ===")
R()
body("ALTA;A"); body("ALTA;B"); body("DEPOSITO;AC-0001;100")
for i in range(4):
    body("TRANSFER;AC-0001;AC-0002;101",f"E507 #{i+1}")
body("ANULA;OP-0001","anular depósito estando bloqueada")
body("TRANSFER;AC-0001;AC-0002;10","¿desbloqueó ANULA?")
body("CONSULTA;AC-0001","consulta")
body("CONSULTA;AC-0002","consulta destino")

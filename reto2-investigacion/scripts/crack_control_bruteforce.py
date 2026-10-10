import sys, time
sys.path.insert(0,'/tmp')
from api import S, B, TOKEN, reset, msg

def find(body, lo=0, hi=100):
    good=[]
    for c in range(lo,hi):
        reset()
        st, bd, h = msg(f"{body};{c}")
        if not (isinstance(bd,dict) and bd.get("error")=="E202"):
            good.append((c, st, bd))
        time.sleep(0.105)
    return good

for body in ["ALTA;Prueba", "CONSULTA;AC-9999", "DEPOSITO;AC-9999;100", "ANULA;OP-9999", "SALDOS;X"]:
    g = find(body)
    print(body, "=>", g)

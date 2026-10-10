import sys, time, json, os
sys.path.insert(0,'/tmp')
from api import S, B, reset, msg
CACHE='/tmp/ctl_cache2.json'
cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}

def send(m):
    while True:
        st,bd,h=msg(m)
        if st==429:
            time.sleep(1.0); continue
        return st,bd
def full(body):
    if body in cache: return cache[body]
    good=[]
    for c in range(100):
        st,bd=send(f"{body};{c}")
        if not (isinstance(bd,dict) and bd.get('error')=='E202'):
            good.append((c,st,bd))
        time.sleep(0.115)
    cache[body]=good
    json.dump(cache,open(CACHE,'w'))
    return good

bodies = ["SALDOS;A","SALDOS;B","SALDOS;C","SALDOS;D","SALDOS;E","SALDOS;X","SALDOS;Z",
          "SALDOS;0","SALDOS;1","SALDOS;9",
          "SALDOSA;A","SALDOSB;A","A;A","B;A","AA;A","AB;A","SALDO;X","SALDOSS;X","SALDO;A"]
for b in bodies:
    print(b, full(b), flush=True)

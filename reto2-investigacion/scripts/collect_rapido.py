import sys, time, json, os, random
sys.path.insert(0,'/tmp')
from api import S, B, reset, msg

CACHE='/tmp/ctl_cache.json'
cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}

def send(m, retries=3):
    for _ in range(retries):
        st,bd,h=msg(m)
        if st==429:
            time.sleep(0.6); continue
        return st,bd,h
    return st,bd,h

def find(body, full=False):
    if body in cache and not full: return cache[body]
    good=[]
    rng=list(range(100))
    random.shuffle(rng)
    if full: rng=list(range(100))
    for c in rng:
        st,bd,h=send(f"{body};{c}")
        time.sleep(0.11)
        if not (isinstance(bd,dict) and bd.get('error')=='E202'):
            good.append(c)
            if not full: break
    cache[body]=good
    json.dump(cache,open(CACHE,'w'))
    return good

if __name__=='__main__':
    samples=[]
    # vary arg char after prefix
    for ch in "ABCDEFGHIJ":
        samples.append(f"SALDOS;{ch}")
    for body in samples:
        print(body, find(body))
    # vary prefix char
    for ch in "ABCDEFGHIJ":
        samples.append(f"SALDOS{ch};A")
    for body in [s for s in samples if s.startswith("SALDOS") and s.count(';') and not s.startswith("SALDOS;")]:
        print(body, find(body))

import sys, time, json
sys.path.insert(0,'/tmp')
from api import S, B, TOKEN

def call(desc, method, path, body=None, data=None, headers=None, auth=True, raw_text=None):
    h = dict(S.headers)
    if not auth: h.pop("Authorization", None)
    if headers: h.update(headers)
    try:
        if raw_text is not None:
            r = S.request(method, B+path, data=raw_text, headers=h, timeout=8)
        else:
            r = S.request(method, B+path, json=body, headers=h, timeout=8)
        try: b = r.json()
        except: b = r.text
        print(f"{desc}\n  -> {r.status_code} {json.dumps(b, ensure_ascii=False)}  x-req={r.headers.get('x-req')}")
        return r.status_code, b
    except Exception as e:
        print(f"{desc}\n  -> ERR {e}")
        return None, str(e)

print("===== AUTENTICACION =====")
for tok in [None, "Bearer", "Bearer ", "Bearer wrong", "bearer "+TOKEN, TOKEN, "Bearer "+TOKEN]:
    hh = {"Authorization": tok} if tok is not None else {"Authorization":""}
    try:
        r = S.post(B+"/msg", json={"m":"PING;64"}, headers=hh, timeout=8)
        print(f"auth={tok!r:45} -> {r.status_code} {r.text[:80]}")
    except Exception as e: print("ERR",e)
    time.sleep(0.12)

print("\n===== RUTAS / METODOS =====")
for meth, path in [("GET","/"),("POST","/"),("GET","/health"),("POST","/health"),("GET","/msg"),
                   ("PUT","/msg"),("DELETE","/msg"),("GET","/__reset"),("POST","/__reset"),
                   ("POST","/foo"),("GET","/foo"),("GET","/msg/"),("POST","/msg/"),
                   ("OPTIONS","/msg"),("HEAD","/health")]:
    call(f"{meth} {path}", meth, path, body={"m":"PING;64"} if meth in ("POST","PUT") else None)

print("\n===== CONTROL RANGE / PING =====")
S.post(B+"/__reset", timeout=8)
for c in ["64","0064"," 64","64 ","+64","0x40","064","64.0","abc","","-1","99999999999999999999","100","200","255"]:
    call(f"PING;{c!r}", "POST", "/msg", body={"m":f"PING;{c}"})
    time.sleep(0.11)

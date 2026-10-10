import sys, time
sys.path.insert(0,'/tmp')
from api import S, B, reset, msg
print("--- reset, luego 6 PING ---")
for i in range(6):
    st,bd,h=msg("PING;64")
    print(i, st, bd, "x-req=",h.get("x-req"))
print("--- __reset, 3 PING ---")
reset()
for i in range(3):
    st,bd,h=msg("PING;64")
    print(i, st, bd, "x-req=",h.get("x-req"))
print("--- test ALTA;Lucia;82 tras varios requests ---")
reset()
# send PING to advance counter, then try ALTA Lucia 82
for i in range(5):
    msg("PING;64")
st,bd,h=msg("ALTA;Lucia;82")
print("ALTA;Lucia;82 despues de 5:", st, bd, "x-req=",h.get("x-req"))
print("--- reset y probar ALTA;Lucia con varios controles ---")
reset()
for c in [82, 83, 0, 1, 81, 84]:
    st,bd,h=msg(f"ALTA;Lucia;{c}")
    print("ALTA;Lucia;%d"%c, st, bd, "x-req=",h.get("x-req"))

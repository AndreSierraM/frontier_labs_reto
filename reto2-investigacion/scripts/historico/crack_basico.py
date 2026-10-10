import zlib, hashlib

pairs = [
 ("PING", 64),
 ("ALTA;Lucia", 82),
 ("ALTA;Mateo", 3),
 ("CONSULTA;AC-0001", 14),
 ("DEPOSITO;AC-0001;250000", 86),
 ("TRANSFER;AC-0001;AC-0002;40000", 86),
 ("CONSULTA;AC-0002", 11),
 ("TRANSFER;AC-0001;AC-0002;120000", 55),
 ("TRANSFER;AC-0001;AC-0002;100000", 12),
 ("SALDOS;AC-0001", 38),
 ("ANULA;OP-0003", 66),
 ("CONSULTA;AC-0009", 87),
 ("TRANSFER;AC-0002;AC-0001;50000", 23),
 ("DEPOSITO;AC-0002;700", 35),
]

def test(name, fn):
    ok = all(fn(s) % 100 == v for s, v in pairs)
    if ok:
        print("MATCH mod100:", name)
    return ok

# candidate hash funcs
def djb2(s):
    h = 5381
    for c in s.encode(): h = (h*33 + c) & 0xffffffff
    return h
def djb2_xor(s):
    h = 5381
    for c in s.encode(): h = ((h*33) ^ c) & 0xffffffff
    return h
def sdbm(s):
    h = 0
    for c in s.encode(): h = (c + (h<<6) + (h<<16) - h) & 0xffffffff
    return h
def fnv1a(s):
    h = 2166136261
    for c in s.encode(): h = ((h ^ c) * 16777619) & 0xffffffff
    return h
def fnv1(s):
    h = 2166136261
    for c in s.encode(): h = ((h * 16777619) & 0xffffffff) ^ c
    return h
def java(s):
    h = 0
    for c in s.encode(): h = (h*31 + c) & 0xffffffff
    return h
def crc32(s): return zlib.crc32(s.encode())
def adler(s): return zlib.adler32(s.encode())
def crc8(s, poly=0x07, init=0, refin=False, refout=False, xorout=0):
    crc = init
    for byte in s.encode():
        crc ^= byte
        for _ in range(8):
            crc = ((crc<<1) ^ poly) & 0xff if (crc & 0x80) else (crc<<1) & 0xff
    return crc

cands = {
 "sum": lambda s: sum(s.encode()),
 "xor": lambda s: __import__('functools').reduce(lambda a,b:a^b, s.encode(), 0),
 "djb2": djb2, "djb2_xor": djb2_xor, "sdbm": sdbm,
 "fnv1a": fnv1a, "fnv1": fnv1, "java": java,
 "crc32": crc32, "adler": adler,
 "len": lambda s: len(s),
}
for i in range(1, 260):
    cands[f"sum*{i}"] = (lambda k: (lambda s: sum(s.encode())*k))(i)
    cands[f"xor*{i}"] = (lambda k: (lambda s: __import__('functools').reduce(lambda a,b:a^b, s.encode(), 0)*k))(i)

for n, f in cands.items():
    try:
        test(n, f)
    except Exception as e:
        pass

# also mod 256 / mod 10000 etc against raw value? values<100 only. Also maybe value is direct not mod.
# print all candidate values for PING
for n in ["sum","xor","djb2","sdbm","fnv1a","java","crc32","adler"]:
    print(n, "PING->", cands[n]("PING"), "ALTA;Lucia->", cands[n]("ALTA;Lucia"))

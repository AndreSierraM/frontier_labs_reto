import zlib, functools
pairs = [
 ("ALTA;Lucia",82),("ALTA;Mateo",3),("ALTA;Prueba",14),
 ("CONSULTA;AC-0001",14),("DEPOSITO;AC-0001;250000",86),
 ("TRANSFER;AC-0001;AC-0002;40000",86),("CONSULTA;AC-0002",11),
 ("TRANSFER;AC-0001;AC-0002;120000",55),("TRANSFER;AC-0001;AC-0002;100000",12),
 ("SALDOS;AC-0001",38),("ANULA;OP-0003",66),("CONSULTA;AC-0009",87),
 ("TRANSFER;AC-0002;AC-0001;50000",23),("DEPOSITO;AC-0002;700",35),
 ("CONSULTA;AC-9999",90),("DEPOSITO;AC-9999;100",34),("ANULA;OP-9999",51),
 ("SALDOS;X",91),
]
def java(s):
    h=0
    for c in s.encode(): h=(h*31+c)&0xffffffff
    return h
def djb2(s):
    h=5381
    for c in s.encode(): h=(h*33+c)&0xffffffff
    return h
def sdbm(s):
    h=0
    for c in s.encode(): h=(c+(h<<6)+(h<<16)-h)&0xffffffff
    return h
def fnv1a(s):
    h=2166136261
    for c in s.encode(): h=((h^c)*16777619)&0xffffffff
    return h
print(f"{'body':35} {'ctrl':>4} {'java%100':>8} {'djb2%100':>8} {'sdbm%100':>8} {'fnv%100':>8} {'crc32%100':>9} {'adler%100':>9} {'sum%100':>7} {'xor%100':>7}")
for s,v in pairs:
    x=functools.reduce(lambda a,b:a^b,s.encode(),0)
    print(f"{s:35} {v:>4} {java(s)%100:>8} {djb2(s)%100:>8} {sdbm(s)%100:>8} {fnv1a(s)%100:>8} {zlib.crc32(s.encode())%100:>9} {zlib.adler32(s.encode())%100:>9} {sum(s.encode())%100:>7} {x%100:>7}")

import zlib
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
def test(name, f):
    if all(f(s.encode())==v for s,v in pairs): print("MATCH",name)
def fletcher16(data):
    a=b=0
    for x in data:
        a=(a+x)%255; b=(b+a)%255
    return (b<<8)|a
def fletcher16_100(data):
    a=b=0
    for x in data:
        a=(a+x)%100; b=(b+a)%100
    return (b<<8)|a
for M in [10,100,255,256]:
    def mk(M):
        def f(d):
            a=b=0
            for x in d: a=(a+x)%M; b=(b+a)%M
            return b
        return f
    test(f"fletcherB mod{M}", mk(M))
    def mk2(M):
        def f(d):
            a=b=0
            for x in d: a=(a+x)%M; b=(b+a)%M
            return a
        return f
    test(f"fletcherA mod{M}", mk2(M))

# pearson-ish / xor variants
def xorall(d):
    h=0
    for x in d: h^=x
    return h
def sumxor(d):
    h=0
    for x in d: h=(h+x)^x
    return h
def alternating(d):
    s=0
    for i,x in enumerate(d): s=(s + (x if i%2==0 else -x))
    return s
def rotating(d):
    h=0
    for x in d: h=((h<<1)|(h>>7))&0xff ^ x
    return h
import functools
cands={'xor':xorall,'sumxor':sumxor,'alternating':alternating,'rotating':rotating,
       'crc32mod100':lambda d:zlib.crc32(d)%100,
       'crc32lo':lambda d:zlib.crc32(d)&0xff,
       'crc32hi':lambda d:(zlib.crc32(d)>>8)&0xff,
       'adlerlo':lambda d:zlib.adler32(d)&0xff,
       'adlerhi':lambda d:(zlib.adler32(d)>>8)&0xff,
       'adler%100':lambda d:zlib.adler32(d)%100,
}
for n,f in cands.items(): test(n,f)

# CRC16 variants
def crc16(data, poly, init=0, refin=False, refout=False, xorout=0):
    crc=init
    for b in data:
        if refin: b=int(f'{b:08b}'[::-1],2)
        crc ^= b<<8
        for _ in range(8):
            crc = ((crc<<1)^poly)&0xffff if crc&0x8000 else (crc<<1)&0xffff
    if refout: crc=int(f'{crc:016b}'[::-1],2)
    return crc^xorout
polys={'CCITT':0x1021,'IBM':0x8005,'DNP':0x3D65,'T10':0x8BB7,'CDMA':0xC867}
for pn,p in polys.items():
    for init in (0,0xffff):
        for xorout in (0,0xffff):
            for refin in (False,True):
                for refout in (False,True):
                    for red in ['lo','hi','mod100']:
                        def redf(c,red=red):
                            return c&0xff if red=='lo' else ((c>>8)&0xff if red=='hi' else c%100)
                        if all(redf(crc16(s.encode(),p,init,refin,refout,xorout))==v for s,v in pairs):
                            print("CRC16 MATCH",pn,hex(p),init,xorout,refin,refout,red)
print("done")

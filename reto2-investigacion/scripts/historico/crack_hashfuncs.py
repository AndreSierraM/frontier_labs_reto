import functools
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
sm=lambda s:sum(s.encode())
patterns={}
patterns['pos1']=lambda s:sum((i+1)*c for i,c in enumerate(s.encode()))
patterns['pos0']=lambda s:sum(i*c for i,c in enumerate(s.encode()))
patterns['rpos']=lambda s:sum((len(s)-i)*c for i,c in enumerate(s.encode()))
patterns['digits']=lambda s:sum(int(c) for c in s if c.isdigit())
patterns['letters']=lambda s:sum(ord(c)-64 for c in s.upper() if 'A'<=c<='Z')
patterns['xor']=lambda s:functools.reduce(lambda a,b:a^b,s.encode(),0)
for K in range(0,200):
    patterns[f'sum-{K}']=(lambda k:(lambda s:sm(s)-k))(K)
    patterns[f'sum+{K}']=(lambda k:(lambda s:sm(s)+k))(K)
    patterns[f'sum*{K}']=(lambda k:(lambda s:sm(s)*k))(K)
for i in range(0,6):
    patterns[f'fieldsum{i}']=(lambda k:(lambda s:sum((k if j==0 else 1)*sum(f.encode()) for j,f in enumerate(s.split(';')))))(i)

for M in [10,100,97,89,101,251,256,255,1000,10000]:
    for name,f in patterns.items():
        if all(f(s)%M==v for s,v in pairs):
            print("MATCH", name, "mod", M)

# Also: maybe hash of numeric args only via crc etc. Try all pairs of (prefix compare)
# CRC8 brute
def crc8(data,poly,init,xorout,refin):
    crc=init
    for b in data:
        if refin: b=int(f'{b:08b}'[::-1],2)
        crc^=b
        for _ in range(8):
            crc=((crc<<1)^poly)&0xff if crc&0x80 else (crc<<1)&0xff
    return crc^xorout
found=False
for poly in range(1,256):
    for init in (0,0xff):
        for xorout in (0,0xff):
            for refin in (False,True):
                if all(crc8(s.encode(),poly,init,xorout,refin)%100==v for s,v in pairs):
                    print("CRC8 match",hex(poly),init,xorout,refin); found=True
if not found: print("no CRC8 mod100 match")
# djb2 etc mod variants
def djb2(s):
    h=5381
    for c in s.encode(): h=(h*33+c)&0xffffffff
    return h
def java(s):
    h=0
    for c in s.encode(): h=(h*31+c)&0xffffffff
    return h
for name,f in [("djb2",djb2),("java",java)]:
    for M in [100,97,1000,10000,100000,1000000]:
        if all(f(s)%M==v for s,v in pairs): print(name,"mod",M)
print("done")

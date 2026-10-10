pairs = [
 ("PING", 64),("ALTA;Lucia", 82),("ALTA;Mateo", 3),
 ("CONSULTA;AC-0001", 14),("DEPOSITO;AC-0001;250000", 86),
 ("TRANSFER;AC-0001;AC-0002;40000", 86),("CONSULTA;AC-0002", 11),
 ("TRANSFER;AC-0001;AC-0002;120000", 55),("TRANSFER;AC-0001;AC-0002;100000", 12),
 ("SALDOS;AC-0001", 38),("ANULA;OP-0003", 66),("CONSULTA;AC-0009", 87),
 ("TRANSFER;AC-0002;AC-0001;50000", 23),("DEPOSITO;AC-0002;700", 35),
]
mods = [10,100,97,89,251,256,255,127,101,1000]
bases = range(0,300)
for M in mods:
    for b in bases:
        ok = True
        for s, v in pairs:
            h = 0
            for c in s.encode():
                h = (h*b + c) % M
            if h % 100 != v % 100 if False else h != v % M:
                # compare directly to v (v<100)
                if h != v:
                    ok = False; break
        if ok:
            print("ROLLING MATCH mod", M, "base", b)
# also reverse string
for M in mods:
    for b in bases:
        ok = True
        for s, v in pairs:
            h = 0
            for c in s.encode()[::-1]:
                h = (h*b + c) % M
            if h != v:
                ok = False; break
        if ok:
            print("ROLLING REV MATCH mod", M, "base", b)

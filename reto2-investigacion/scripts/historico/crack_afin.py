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
def feats(s):
    fs=s.split(';')
    total=sum(s.encode())
    body_no_sep=sum(ord(ch) for ch in s if ch!=';')
    args=sum(ord(ch) for f in fs[1:] for ch in f)
    cmd=sum(fs[0].encode())
    return {
      'total':total,'body_no_sep':body_no_sep,'args':args,'cmd':cmd,
      'nfields':len(fs),'len':len(s),
      'nchars_nosep':len(s)-s.count(';'),
      'fieldsump':sum((i+1)*sum(f.encode()) for i,f in enumerate(fs)),
      'fieldsum':sum(sum(f.encode()) for f in fs),
      'digits':sum(int(c) for c in s if c.isdigit()),
      'args_digits':sum(int(c) for f in fs[1:] for c in f if c.isdigit()),
    }
F=[feats(s) for s,_ in pairs]
C=[v for _,v in pairs]
keys=F[0].keys()
# affine per single feature over mods
for M in [100,101,97,89,1000]:
  for k in keys:
    vals=[f[k]%M for f in F]
    for a in range(M):
      for b in range(M):
        if all((a*vals[i]+b)%M==C[i]%M for i in range(len(pairs))):
          print("AFFINE",k,"mod",M,"a",a,"b",b)
    # a=1 special
# two-feature affine brute over mod100 limited
import itertools
for M in [100]:
  for k1,k2 in itertools.combinations(keys,2):
    vals1=[f[k1]%M for f in F]; vals2=[f[k2]%M for f in F]
    for a1 in range(M):
      for a2 in range(M):
        # b from first
        b=(C[0]-a1*vals1[0]-a2*vals2[0])%M
        if all((a1*vals1[i]+a2*vals2[i]+b)%M==C[i]%M for i in range(len(pairs))):
          print("2FEAT",k1,k2,"mod",M,a1,a2,b)
print("done")

#!/usr/bin/env python3
"""Dígito de control del servicio: ISO 7064 MOD 97-10 (verificador tipo IBAN).

N = el mensaje sin su último campo, leído como número decimal:
  - dígitos 0-9 valen lo que son
  - letras A-Z valen su posición en el alfabeto (A=1 ... Z=26), sin importar mayúsculas
  - ';' y '-' no aportan
control = 98 - (100 * (N mod 97)) mod 97  -> entero en [2..98]
Se compara como texto SIN ceros a la izquierda (p.ej. '2' vale, '02' no).

Evidencia: validado contra data/pares_control.jsonl.
"""
import sys


def digitos(cuerpo: str) -> str:
    out = []
    for c in cuerpo:
        if c.isdigit() and c.isascii():
            out.append(c)
        elif c.isascii() and c.isalpha():
            out.append(str(ord(c.upper()) - 64))
    return "".join(out)


def control(cuerpo: str) -> int:
    r = 0
    for d in digitos(cuerpo):
        r = (r * 10 + int(d)) % 97
    return 98 - (r * 100) % 97


if __name__ == "__main__":
    for a in sys.argv[1:]:
        print(control(a))

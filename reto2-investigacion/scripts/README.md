# Scripts

Ejecutar los sondeos desde `reto2-investigacion/`. Sus rutas se mantienen para preservar imports, datos y trabajo paralelo.

## Uso local, sin original

- `control.py`: cálculo del control de un mensaje.
- `validar.py --url http://localhost:3111 --token local-test`: corre las tres suites (20 ejemplos + 34 control + 62 batería) contra el reemplazo y escribe `logs/validacion.json`. Reproducible sin el original.
- `verificar.py --url http://localhost:3111 --token local-test`: replay de ejemplos contra el reemplazo; no requiere token real.
- `extraer_pares.py`: consolida datos ya guardados; no es prueba de una nueva regla.

Dependencia: `python3 -m pip install -r requirements.txt`, preferiblemente dentro de un entorno virtual.

## Acceso autorizado al original

- `client.py`: cliente y logger; leer configuración privada desde `.env`.
- `explorar.py`: sondeos de protocolo, comandos y estado.
- `bloqueo*.py`: caracterización del contador de fallos, bloqueo y reset.
- `prueba_diferencial.py`: compara servicios; requiere estado inicial conocido.
- `vigilancia.py`: captura snapshots y detecta diferencias.
- `scan_control.py`: barrido histórico de controles; consume cuota.

No ejecutar estas herramientas automáticamente durante tests locales. Un timeout de una mutación no demuestra que no se ejecutó; reintentar puede duplicar estado. Revisar preparación/reset antes de comparar.

## Históricos y scripts de contexto antiguo

Los seis intentos offline de hashes/CRC/modelos afines están en [historico/](historico/). Se conservan como historial del razonamiento; el cálculo vigente es `control.py`.

Limpieza 2026-10-10: se eliminaron `probe_recon.py`, `probe_xreq.py`, `collect_*.py` y `crack_control_bruteforce.py` (dependían de un módulo `api` externo en `/tmp`, no reproducibles desde un checkout limpio) y los one-shot `cubrir_gaps*.py` (ya cerraron los gaps, IDs 348–366; re-ejecutarlos duplicaría el log). Para pruebas actuales usar el cliente canónico, la suite de exploración y los verificadores.

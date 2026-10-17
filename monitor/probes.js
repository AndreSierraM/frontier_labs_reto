/**
 * Catálogo de sondas del original (datos, sin lógica).
 *
 * `catalog()` devuelve listas uniformes `{label, method, path, body}`:
 *   battery   -> contrato y estado en secuencia (45, una sola pasada rápida)
 *   discovery -> comandos/rutas/montos/controles candidatos (descubren novedades)
 *   routes    -> métodos y rutas inexistentes
 *   all       -> todo (para el recon en GitHub Actions)
 *
 * El control ISO 7064 se calcula aquí con una referencia propia y congelada,
 * sin depender del dominio del reemplazo (si no, la sonda se auto-validaría).
 */
"use strict";

// Referencia congelada ISO 7064 MOD 97-10 (verificador tipo IBAN).
function refControl(cuerpo) {
  let n = "";
  for (const ch of cuerpo) {
    if (ch >= "0" && ch <= "9") n += ch;
    else if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"))
      n += String(ch.toUpperCase().charCodeAt(0) - 64);
  }
  let r = 0;
  for (const d of n) r = (r * 10 + Number(d)) % 97;
  return String(98 - ((r * 100) % 97));
}

const c = (body) => `${body};${refControl(body)}`;

// --- Batería de contrato y estado (secuencia con resets implícitos) --------
const BATERIA = [
  ["reset", null],
  // Regresión (incidente 2026-10-17): sin `ALTA` no existe `AC-0001`. Un monto
  // válido da `404 E401` (K-D4); uno inválido da `400 E303` porque el monto se
  // valida antes que la cuenta (K-D2/K-D3). Bloquea falsos positivos si el
  // monitor reintroduce una cuenta viva en el descubrimiento.
  ["dep-sin-alta", c("DEPOSITO;AC-0001;1000000000")],
  ["dep-monto-inv", c("DEPOSITO;AC-0001;0")],
  ["PING", "PING;64"],
  ["PING-ignore", "PING;abc"],
  ["E103", "PING"],
  ["E104", "PING;"],
  ["E201", "ALTA;Mateo;003"],
  ["E202", "ALTA;Mateo;03"],
  ["E301", c("SALDOS;x")],
  ["E301-sug", c("TRANSFERIR;x")],
  ["ALTA", c("ALTA;A")],
  ["ALTA2", c("ALTA;B")],
  ["CONSULTA", c("CONSULTA;AC-0001")],
  ["DEPOSITO", c("DEPOSITO;AC-0001;100")],
  ["SALDO", c("CONSULTA;AC-0001")],
  ["NOTAS", `NOTAS;${refControl("NOTAS")}`],
  ["HALT", c("HALT;AC-0001")],
  ["T-ok", c("TRANSFER;AC-0001;AC-0002;50")],
  ["T-limite", c("TRANSFER;AC-0001;AC-0002;100001")],
  ["T-saldo", c("TRANSFER;AC-0001;AC-0002;101")],
  ["T-mismo", c("TRANSFER;AC-0001;AC-0001;10")],
  ["T-inexistente", c("TRANSFER;AC-0001;AC-9999;10")],
  ["T-monto", c("TRANSFER;AC-0001;AC-0002;0")],
  ["ANULA-op", c("DEPOSITO;AC-0001;1")],
  ["ANULA", c("ANULA;OP-0001")],
  ["E402", c("ANULA;OP-9999")],
  ["reset2", null],
  ["bloqueo-1", c("ALTA;A")],
  ["bloqueo-2", c("ALTA;B")],
  ["bloqueo-3", c("DEPOSITO;AC-0001;100")],
  ["falta1", c("TRANSFER;AC-0001;AC-0002;101")],
  ["falta2", c("TRANSFER;AC-0001;AC-0002;101")],
  ["falta3", c("TRANSFER;AC-0001;AC-0002;101")],
  ["E510", c("TRANSFER;AC-0001;AC-0002;101")],
  // Bordes de umbral/precisión: si el original cambia el límite (E506) o el
  // formato de saldo, estas sondas lo detectan (el cambio de 100000->50000 de
  // la v2 no lo veía la batería anterior).
  ["lim-reset", null],
  ["lim-A", c("ALTA;A")],
  ["lim-B", c("ALTA;B")],
  ["lim-dep", c("DEPOSITO;AC-0001;1000000")],
  ["lim-saldo", c("CONSULTA;AC-0001")],
  ["lim-50000", c("TRANSFER;AC-0001;AC-0002;50000")],
  ["lim-50001", c("TRANSFER;AC-0001;AC-0002;50001")],
  // Incidente 2026-10-17 · caso 2 del diagnóstico: con la cuenta creada, el
  // monto máximo válido (1000000000) acredita `OP-0001` (no E303/E506). Va al
  // final de la batería para no correr los contadores de las sondas previas.
  ["dep-con-alta-reset", null],
  ["dep-con-alta-a", c("ALTA;A")],
  ["dep-con-alta", c("DEPOSITO;AC-0001;1000000000")],
];

// --- Descubrimiento -------------------------------------------------------
// Un comando candidato que NO responda E301 es un comando nuevo.
const COMANDOS = [
  "SALDO", "SALDOS", "EXTRACTO", "MOVIMIENTOS", "LISTA", "BAJA", "CIERRA",
  "RETIRA", "RETIRO", "DEPOSITAR", "TRANSFERIR", "CANCELA", "REVERSA",
  "ANULAR", "HISTORIAL", "INFO", "STATUS", "AYUDA", "HELP", "VERSION",
  "ECO", "PING2", "SET", "GET", "QUERY", "ORDEN", "PAGO", "COBRO",
  "HALT", "NOTAS",
];
// Montos de borde (válidos e inválidos).
const MONTOS = [
  "0", "1", "9", "10", "999999999", "1000000000", "10000000000",
  "0001", "+1", "1.5", "-1", "1e3", " 1", "1 ", "99999999999999999999",
];
// Valores de control de borde.
const CONTROLES = ["0", "00", "2", "98", "003", "+3", "3abc", " ", "999"];
// Rutas y métodos candidatos (descubren endpoints nuevos).
const RUTAS = [
  ["GET", "/"], ["GET", "/favicon.ico"], ["GET", "/robots.txt"],
  ["GET", "/metrics"], ["GET", "/debug"], ["GET", "/admin"],
  ["GET", "/status"], ["GET", "/version"], ["GET", "/api"],
  ["GET", "/openapi.json"], ["GET", "/msg/"], ["GET", "/health/"],
  ["GET", "/__reset/"], ["PUT", "/msg"], ["DELETE", "/msg"],
  ["PATCH", "/msg"], ["OPTIONS", "/msg"], ["POST", "/health"],
];

// --- Catálogo uniforme ----------------------------------------------------
function catalog() {
  const battery = BATERIA.map(([label, m]) => ({
    label,
    method: "POST",
    path: m === null ? "/__reset" : "/msg",
    body: m === null ? null : { m },
  }));
  const discovery = [
    ...COMANDOS.map((cmd) => ({ label: `cmd:${cmd}`, method: "POST", path: "/msg", body: { m: c(`${cmd};x`) } })),
    ...MONTOS.map((m) => ({ label: `monto:${m}`, method: "POST", path: "/msg", body: { m: c(`DEPOSITO;AC-0001;${m}`) } })),
    ...CONTROLES.map((ctl) => ({ label: `ctl:${ctl}`, method: "POST", path: "/msg", body: { m: `ALTA;Mateo;${ctl}` } })),
  ];
  const routes = RUTAS.map(([method, path]) => ({ label: `route:${method}:${path}`, method, path }));
  return { battery, discovery, routes, all: [...battery, ...discovery, ...routes] };
}

module.exports = { BATERIA, COMANDOS, MONTOS, CONTROLES, RUTAS, catalog, refControl };
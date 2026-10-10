#!/usr/bin/env node
/**
 * Catálogo de escaneo AMPLIADO (privado, no lo usa el monitor oficial).
 *
 * Fase 1 · descubrimiento de endpoints: prueba muchos nombres de comando y
 *   rutas candidatas. Cualquier respuesta != E301 (comandos) o != E404 (rutas)
 *   revela un comando/ruta que existe (nuevo o cambiado).
 * Fase 2 · profundidad: se combina con `monitor/probes.js` (batería) en
 *   `tools/watch-map.js`.
 */
"use strict";

const { refControl } = require("../monitor/probes.js");
const c = (body) => `${body};${refControl(body)}`;

// Comandos candidatos (el original no reconoce los que devuelven E301).
const COMANDOS = [
  "PING", "ALTA", "CONSULTA", "DEPOSITO", "TRANSFER", "ANULA",
  "SALDO", "SALDOS", "EXTRACTO", "EXTRACTOS", "MOVIMIENTOS", "HISTORIAL",
  "LISTA", "LISTAR", "BAJA", "BAJAS", "CIERRA", "CERRAR",
  "RETIRA", "RETIRO", "RETIRAR", "DEPOSITAR", "TRANSFERIR",
  "CANCELA", "CANCELAR", "REVERSA", "REVERSAR", "ANULAR",
  "INFO", "STATUS", "AYUDA", "HELP", "VERSION", "VERSIONS", "ECO", "ECHO",
  "SET", "GET", "QUERY", "ORDEN", "ORDENES", "PAGO", "PAGOS", "COBRO", "COBROS",
  "BLOQUEO", "BLOQUEA", "BLOQUEAR", "DESBLOQUEO", "DESBLOQUEA", "DESBLOQUEAR",
  "RESET", "CLEAR", "CUENTA", "CUENTAS", "TITULAR", "NOMBRE", "RENOMBRA",
  "INGRESO", "INGRESAR", "ABONO", "ABONAR", "DEBITO", "DEBITAR",
  "CREDITO", "CREDITAR", "EXISTE", "VER", "MUESTRA", "MOSTRAR",
  "CREA", "CREAR", "ELIMINA", "ELIMINAR", "MODIFICA", "MODIFICAR",
  "ACTUALIZA", "ACTUALIZAR", "CONSULTAR", "OPERACION", "OPERACIONES",
  "RECIBO", "COMPROBANTE", "TICKET", "COMISION", "INTERES", "PRESTAMO",
  "AHORRO", "PLAZO", "DETALLE", "DETALLES", "BUSCAR", "FILTRA", "FILTRAR",
  "TOTAL", "SUM", "CUANTOS", "BORRAR", "ARCHIVAR", "EXPORTAR", "IMPRIMIR",
  "DESHACER", "REHACER", "INICIO", "LOGIN", "LOGOUT", "TOKEN", "AUTH",
  "SESION", "ADMIN", "DEBUG", "TEST", "NOOP", "PING2", "PONG",
  "ID", "IDS", "NEXT", "LAST", "FIRST", "ALL", "NONE",
];

// Rutas/métodos candidatos (cualquier respuesta != 404 revela una ruta nueva).
const RUTAS = [
  ["GET", "/"], ["GET", "/favicon.ico"], ["GET", "/robots.txt"],
  ["GET", "/metrics"], ["GET", "/debug"], ["GET", "/admin"],
  ["GET", "/status"], ["GET", "/version"], ["GET", "/api"],
  ["GET", "/openapi.json"], ["GET", "/openapi.yaml"], ["GET", "/swagger.json"],
  ["GET", "/docs"], ["GET", "/api/msg"], ["GET", "/api/health"],
  ["GET", "/api/v1"], ["GET", "/v1"], ["GET", "/v1/msg"],
  ["GET", "/msg/"], ["GET", "/health/"], ["GET", "/__reset/"],
  ["GET", "/cuentas"], ["GET", "/cuenta"], ["GET", "/operaciones"],
  ["GET", "/transfer"], ["GET", "/deposito"], ["GET", "/ping"],
  ["POST", "/api/msg"], ["POST", "/reset"], ["POST", "/ping"],
  ["PUT", "/msg"], ["DELETE", "/msg"], ["PATCH", "/msg"],
  ["OPTIONS", "/msg"], ["OPTIONS", "/__reset"], ["POST", "/health"],
  ["PUT", "/health"], ["POST", "/__reset/"], ["HEAD", "/health"],
];

function catalog() {
  const discovery = [
    ...COMANDOS.map((cmd) => ({ label: `cmd:${cmd}`, method: "POST", path: "/msg", body: { m: c(`${cmd};x`) } })),
    ...RUTAS.map(([method, path]) => ({ label: `route:${method}:${path}`, method, path })),
  ];
  return { discovery, all: discovery };
}

module.exports = { catalog, COMANDOS, RUTAS };

/**
 * Dominio puro de la caja negra: sin HTTP, sin E/S.
 *
 * Un "puerto" pequeño (`control`, `processMessage`) y todo el comportamiento
 * (cálculo, parsing, máquina de estados y errores) escondido aquí.
 * Es testeable en proceso y reutilizable por cualquier adaptador.
 */
"use strict";

// ---------- catálogo de errores ----------
const ERRORES = {
  E001: [401, { error: "E001", mensaje: "no autorizado" }],
  E100: [400, { error: "E100", mensaje: "json inválido" }],
  E101: [413, { error: "E101", mensaje: "cuerpo demasiado grande" }],
  E102: [400, { error: "E102", mensaje: "falta m" }],
  E103: [400, { error: "E103", mensaje: "falta control" }],
  E104: [400, { error: "E104", mensaje: "segmento vacío" }],
  E201: [400, { error: "E201", mensaje: "control mal formado" }],
  E202: [400, { error: "E202", mensaje: "control inválido" }],
  E301: [400, { error: "E301", mensaje: "comando desconocido " }],
  E302: [400, { error: "E302", mensaje: "aridad inválida" }],
  E303: [400, { error: "E303", mensaje: "monto inválido" }],
  E304: [400, { error: "E304", mensaje: "origen y destino iguales" }],
  E401: [404, { error: "E401", mensaje: "cuenta inexistente" }],
  E402: [404, { error: "E402", mensaje: "operación inexistente" }],
  E404: [404, { error: "E404", mensaje: "ruta desconocida" }],
  E506: [422, { error: "E506", mensaje: "limite superado" }],
  E507: [422, { error: "E507", mensaje: "saldo insuficiente" }],
  E510: [409, { error: "E510", mensaje: "cuenta bloqueada" }],
};

// ---------- dígito de control: ISO 7064 MOD 97-10 (verificador IBAN) ----------
function digitos(cuerpo) {
  let out = "";
  for (const ch of cuerpo) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"))
      out += String(ch.toUpperCase().charCodeAt(0) - 64);
  }
  return out;
}

function control(cuerpo) {
  let r = 0;
  for (const d of digitos(cuerpo)) r = (r * 10 + Number(d)) % 97;
  return String(98 - ((r * 100) % 97));
}

// ---------- sugerencia por distancia de edición ----------
const COMANDOS = ["PING", "ALTA", "CONSULTA", "DEPOSITO", "TRANSFER", "ANULA"];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const fila = new Array(n + 1);
    fila[0] = i;
    return fila;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

function sugerencia(cmd) {
  let mejor = null, mejorD = 99;
  for (const c of COMANDOS) {
    const d = levenshtein(cmd, c);
    if (d < mejorD) { mejorD = d; mejor = c; }
  }
  return mejorD <= 2 ? mejor : null;
}

// ---------- estado ----------
function freshState() {
  return {
    cuentas: new Map(),      // id -> { saldo, fallos, nombre }
    operaciones: new Map(),  // id -> { tipo, origen, destino, monto, anulada }
    nextCuenta: 1,
    nextOperacion: 1,
  };
}

const pad = (n) => String(n).padStart(4, "0");
const nuevaCuenta = (state, nombre) => {
  const id = "AC-" + pad(state.nextCuenta++);
  state.cuentas.set(id, { saldo: 0, fallos: 0, nombre });
  return id;
};
const nuevaOperacion = (state, op) => {
  const id = "OP-" + pad(state.nextOperacion++);
  state.operaciones.set(id, op);
  return id;
};

// monto válido: entero positivo, 1..10 dígitos, sin ceros a la izquierda
const MONTO = /^[1-9][0-9]{0,9}$/;

// ---------- procesamiento ----------
/** @returns {{code:string, sugerencia?:string}|{ok:object, status?:number}} */
function processMessage(state, m) {
  if (m.split(";").length < 2) return { code: "E103" };

  const idx = m.lastIndexOf(";");
  const body = m.slice(0, idx);
  const controlStr = m.slice(idx + 1);
  const segs = m.split(";");

  if (segs.some((s) => s === "")) return { code: "E104" };

  const cmd = segs[0].toUpperCase();

  // control (PING lo ignora) — E201/E202 antes que aridad y despacho
  if (cmd !== "PING") {
    if (!/^[0-9]{1,2}$/.test(controlStr)) return { code: "E201" };
    if (controlStr !== control(body)) return { code: "E202" };
  }

  switch (cmd) {
    case "PING":
      if (segs.length !== 2) return { code: "E302" };
      return { ok: { pong: true } };

    case "ALTA":
      if (segs.length !== 3) return { code: "E302" };
      return { ok: { cuentaId: nuevaCuenta(state, segs[1]) }, status: 201 };

    case "CONSULTA": {
      if (segs.length !== 3) return { code: "E302" };
      const c = state.cuentas.get(segs[1]);
      if (!c) return { code: "E401" };
      return { ok: { cuenta_id: segs[1], saldo: c.saldo } };
    }

    case "DEPOSITO": {
      if (segs.length !== 4) return { code: "E302" };
      if (!MONTO.test(segs[2])) return { code: "E303" };
      const c = state.cuentas.get(segs[1]);
      if (!c) return { code: "E401" };
      const monto = Number(segs[2]);
      c.saldo += monto;
      c.fallos = 0; // un depósito desbloquea/reinicia
      return {
        ok: {
          status: "recieved",
          operacionId: nuevaOperacion(state, { tipo: "DEPOSITO", destino: segs[1], monto, anulada: false }),
        },
      };
    }

    case "TRANSFER": {
      if (segs.length !== 5) return { code: "E302" };
      if (!MONTO.test(segs[3])) return { code: "E303" };
      if (segs[1] === segs[2]) return { code: "E304" };
      const origen = state.cuentas.get(segs[1]);
      const destino = state.cuentas.get(segs[2]);
      if (!origen || !destino) return { code: "E401" };
      if (origen.fallos >= 3) return { code: "E510" };
      const monto = Number(segs[3]);
      if (monto > 100000) {
        origen.fallos += 1;
        return { code: "E506" };
      }
      if (monto > origen.saldo) {
        origen.fallos += 1;
        return { code: "E507" };
      }
      origen.saldo -= monto;
      destino.saldo += monto;
      origen.fallos = 0; // un éxito reinicia el contador del origen
      return {
        ok: {
          status: "recieved",
          operacionId: nuevaOperacion(state, {
            tipo: "TRANSFER", origen: segs[1], destino: segs[2], monto, anulada: false,
          }),
        },
      };
    }

    case "ANULA": {
      if (segs.length !== 3) return { code: "E302" };
      const op = state.operaciones.get(segs[1]);
      if (!op) return { code: "E402" };
      if (op.anulada) return { ok: { ok: false, motivo: "ya anulada" } };
      if (op.tipo === "DEPOSITO") {
        const c = state.cuentas.get(op.destino);
        if (c) c.saldo -= op.monto;
      } else if (op.tipo === "TRANSFER") {
        const o = state.cuentas.get(op.origen);
        const d = state.cuentas.get(op.destino);
        if (o) o.saldo += op.monto;
        if (d) d.saldo -= op.monto;
      }
      op.anulada = true;
      return { ok: { ok: true, anulada: segs[1] } };
    }

    default: {
      const sug = sugerencia(cmd);
      return { code: "E301", sugerencia: sug };
    }
  }
}

module.exports = { ERRORES, control, digitos, processMessage, freshState, sugerencia, COMANDOS };

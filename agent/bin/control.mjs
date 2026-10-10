#!/usr/bin/env node
/** Imprime el dígito de control ISO 7064 de un cuerpo. Uso: node agent/bin/control.mjs "ALTA;A" */
import dominio from "../../reemplazo/src/domain.js";

const body = process.argv.slice(2).join(" ");
if (!body) {
  console.error('uso: node agent/bin/control.mjs "CUERPO"');
  process.exit(2);
}
console.log(dominio.control(body));
const assert = require('node:assert/strict');
const steps = require('../src/demo-evidence.json');
const { freshState, control, processMessage } = require('../../reemplazo/src/domain.js');

const state = freshState();
for (const step of steps) {
  assert.equal(step.m, `${step.body};${control(step.body)}`);
  const result = processMessage(state, step.m);
  assert.deepEqual(result.ok, step.response, step.body);
  assert.equal(result.status || 200, step.status, step.body);
  assert.deepEqual(Array.from(state.cuentas, ([id, account]) => ({
    id, name: account.nombre, balance: (account.saldo / 100).toFixed(2),
  })), step.accounts, step.body);
}
console.log(`${steps.length} operaciones de la demo: respuestas y estado verificados.`);

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { KIND, SWARM_KINDS, CHANGE_KINDS, INFRA_KINDS, wakesSwarm, timelineType, classify } = require("./kinds");

test("las listas de la taxonomía son las esperadas", () => {
  assert.deepEqual([...SWARM_KINDS].sort(), [
    KIND.MAP_ADDED, KIND.MAP_VALUE_CHANGED, KIND.NEW_COMMAND, KIND.NEW_ROUTE, KIND.ORIGINAL_CHANGED,
  ].sort());
  assert.deepEqual([...INFRA_KINDS].sort(), [KIND.MAP_RATELIMITED, KIND.ORIGINAL_RATELIMITED].sort());
  assert.deepEqual([...CHANGE_KINDS].sort(), [
    KIND.MAP_ADDED, KIND.MAP_VALUE_CHANGED, KIND.NEW_COMMAND, KIND.NEW_ROUTE,
    KIND.ORIGINAL_CHANGED, KIND.REPLACEMENT_DIVERGENT,
  ].sort());
});

test("wakesSwarm: los 5 tipos que despiertan al enjambre", () => {
  for (const kind of [KIND.ORIGINAL_CHANGED, KIND.MAP_ADDED, KIND.MAP_VALUE_CHANGED, KIND.NEW_COMMAND, KIND.NEW_ROUTE]) {
    assert.equal(wakesSwarm(kind), true);
  }
});

test("wakesSwarm: replacement_divergent NO despierta al enjambre", () => {
  assert.equal(wakesSwarm(KIND.REPLACEMENT_DIVERGENT), false);
});

test("timelineType: una de cada categoría", () => {
  assert.equal(timelineType(KIND.ORIGINAL_CHANGED), "change");
  assert.equal(timelineType(KIND.ADAPTATION_APPLIED), "ack");
  assert.equal(timelineType(KIND.MAP_RATELIMITED), "infra");
  assert.equal(timelineType(KIND.REPLACEMENT_UNHEALTHY), "event");
});

test("classify: clave nueva -> new_command/new_route/map_added", () => {
  assert.equal(classify({}, {}, "cmd:SALDO"), KIND.NEW_COMMAND);
  assert.equal(classify({}, {}, "route:GET:/x"), KIND.NEW_ROUTE);
  assert.equal(classify({}, {}, "monto:1"), KIND.MAP_ADDED);
});

test("classify: cmd que era E301 y ahora responde -> new_command", () => {
  assert.equal(
    classify({ "cmd:X": { response: { error: "E301" } } }, { "cmd:X": { response: { error: "E200" } } }, "cmd:X"),
    KIND.NEW_COMMAND
  );
});

test("classify: ruta que era 404 y ahora responde -> new_route", () => {
  assert.equal(classify({ "route:GET:/x": { status: 404 } }, { "route:GET:/x": { status: 200 } }, "route:GET:/x"), KIND.NEW_ROUTE);
});

test("classify: valor existente cambiado -> map_value_changed", () => {
  assert.equal(
    classify({ "monto:1": { status: 200, body: 1 } }, { "monto:1": { status: 200, body: 2 } }, "monto:1"),
    KIND.MAP_VALUE_CHANGED
  );
});

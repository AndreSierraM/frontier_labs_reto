/**
 * Taxonomía única de los eventos del monitor.
 *
 * Antes cada módulo (map.js, run.js, dashboard.js, monitorClient.mjs) tenía su
 * propia lista de "kind", y ya habían divergido. Aquí vive la única definición
 * de qué es un cambio, qué despierta al enjambre, qué es infra y cómo se
 * clasifica una diferencia del mapa.
 */
"use strict";

const KIND = Object.freeze({
  ORIGINAL_CHANGED: "original_changed",
  NEW_COMMAND: "new_command",
  NEW_ROUTE: "new_route",
  MAP_ADDED: "map_added",
  MAP_VALUE_CHANGED: "map_value_changed",
  MAP_CHANGED: "map_changed",
  ORIGINAL_RATELIMITED: "original_ratelimited",
  MAP_RATELIMITED: "map_ratelimited",
  REPLACEMENT_DIVERGENT: "replacement_divergent",
  REPLACEMENT_UNHEALTHY: "replacement_unhealthy",
  ADAPTATION_APPLIED: "adaptation_applied",
});

// Eventos que despiertan al enjambre: la batería, el mapa y los descubrimientos.
const SWARM_KINDS = new Set([
  KIND.ORIGINAL_CHANGED,
  KIND.MAP_ADDED,
  KIND.MAP_VALUE_CHANGED,
  KIND.NEW_COMMAND,
  KIND.NEW_ROUTE,
]);

// Eventos que el panel muestra como "cambio".
const CHANGE_KINDS = new Set([
  KIND.ORIGINAL_CHANGED,
  KIND.NEW_COMMAND,
  KIND.NEW_ROUTE,
  KIND.MAP_VALUE_CHANGED,
  KIND.MAP_ADDED,
  KIND.REPLACEMENT_DIVERGENT,
]);

// Eventos de infraestructura (rate-limit), no de comportamiento.
const INFRA_KINDS = new Set([KIND.ORIGINAL_RATELIMITED, KIND.MAP_RATELIMITED]);

const wakesSwarm = (kind) => SWARM_KINDS.has(kind);

function timelineType(kind) {
  if (CHANGE_KINDS.has(kind)) return "change";
  if (kind === KIND.ADAPTATION_APPLIED) return "ack";
  if (INFRA_KINDS.has(kind)) return "infra";
  return "event";
}

const isUnknown = (s) => Boolean(s) && s.response && s.response.error === "E301";
const notFound = (s) => Boolean(s) && s.status === 404;

/** Clasifica una diferencia del mapa en un evento concreto. */
function classify(prev, next, label) {
  if (!(label in prev)) return label.startsWith("cmd:") ? KIND.NEW_COMMAND : label.startsWith("route:") ? KIND.NEW_ROUTE : KIND.MAP_ADDED;
  if (label.startsWith("cmd:") && isUnknown(prev[label]) && !isUnknown(next[label])) return KIND.NEW_COMMAND;
  if (label.startsWith("route:") && notFound(prev[label]) && !notFound(next[label])) return KIND.NEW_ROUTE;
  return KIND.MAP_VALUE_CHANGED;
}

module.exports = { KIND, SWARM_KINDS, CHANGE_KINDS, INFRA_KINDS, wakesSwarm, timelineType, classify };

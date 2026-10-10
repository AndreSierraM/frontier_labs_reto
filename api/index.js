/**
 * Entrypoint serverless para Vercel.
 * Reutiliza el servidor http de reemplazo/src/server.js emitiendo el evento
 * 'request' sobre la instancia existente.
 */
const { server } = require('../reemplazo/src/server');

module.exports = (req, res) => {
  server.emit('request', req, res);
};

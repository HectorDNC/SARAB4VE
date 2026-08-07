/**
 * Punto de entrada del módulo verification — re-exporta todas las capas.
 */
const schema = require("./verification.schema");
const service = require("./verification.service");
const repository = require("./verification.repository");
const controller = require("./verification.controller");
const router = require("./verification.routes");

module.exports = {
  // schema
  ...schema,
  // service
  ...service,
  // repository
  ...repository,
  // controller
  ...controller,
  // router
  router,
};

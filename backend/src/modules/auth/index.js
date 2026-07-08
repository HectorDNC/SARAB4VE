/**
 * Punto de entrada del módulo auth — re-exporta todas las capas.
 */
const schema = require("./auth.schema");
const service = require("./auth.service");
const repository = require("./auth.repository");
const controller = require("./auth.controller");
const router = require("./auth.routes");

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

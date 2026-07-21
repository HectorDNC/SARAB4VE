/**
 * Punto de entrada del módulo users — re-exporta todas las capas.
 */
const schema = require("./users.schema");
const service = require("./users.service");
const repository = require("./users.repository");
const controller = require("./users.controller");
const router = require("./users.routes");

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

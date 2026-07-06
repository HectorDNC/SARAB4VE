const schema = require("./emergencies.schema");
const service = require("./emergencies.service");
const repository = require("./emergencies.repository");
const controller = require("./emergencies.controller");
const router = require("./emergencies.routes");

// Re-export con nombres legacy para compatibilidad
module.exports = {
  // schema (validación + constantes)
  ...schema,
  // service
  ...service,
  // repository
  ...repository,
  // controller
  ...controller,
  // router (nuevo)
  router,
  // alias legacy — mantener compatibilidad con código existente
  validateEmergency: schema.validateCreateEmergency,
  validateEmergencySearchParams: schema.validateSearchEmergencies,
  buildListEmergenciesQuery: repository.buildListEmergenciesQuery,
  normalizeEmergency: service.normalizeCreateEmergency,
  createEmergency: service.createEmergency,
};

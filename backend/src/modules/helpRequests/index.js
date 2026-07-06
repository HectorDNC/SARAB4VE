const schema = require("./helpRequests.schema");
const service = require("./helpRequests.service");
const repository = require("./helpRequests.repository");
const controller = require("./helpRequests.controller");
const router = require("./helpRequests.routes");

// Re-export con nombres legacy para compatibilidad
module.exports = {
  // schema
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
  validateHelpRequest: schema.validateCreateHelpRequest,
  normalizeHelpRequest: schema.normalizeCreateHelpRequest,
  validateHelpRequestSearchParams: schema.validateSearchHelpRequests,
  validateHelpRequestAcceptance: schema.validateAcceptHelpRequest,
  normalizeHelpRequestAcceptance: schema.normalizeAcceptHelpRequest,
  buildListHelpRequestsQuery: repository.buildListHelpRequestsQuery,
};

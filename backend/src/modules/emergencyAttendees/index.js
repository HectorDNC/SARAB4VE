const schema = require("./emergencyAttendees.schema");
const service = require("./emergencyAttendees.service");
const repository = require("./emergencyAttendees.repository");
const controller = require("./emergencyAttendees.controller");
const router = require("./emergencyAttendees.routes");

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

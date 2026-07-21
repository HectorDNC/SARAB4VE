const schema = require("./helpRequestAttendees.schema");
const service = require("./helpRequestAttendees.service");
const repository = require("./helpRequestAttendees.repository");
const controller = require("./helpRequestAttendees.controller");
const router = require("./helpRequestAttendees.routes");

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

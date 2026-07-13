/**
 * Rutas — definición del router de Express para help-request-attendees.
 */
const express = require("express");
const controller = require("./helpRequestAttendees.controller");
const service = require("./helpRequestAttendees.service");
const repository = require("./helpRequestAttendees.repository");
const schema = require("./helpRequestAttendees.schema");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router({ mergeParams: true });

router.post("/",
  authenticate, authorize("admin", "organization", "volunteer"),
  controller.createHelpRequestAttendee(service, schema, repository));
router.get("/",
  authenticate, authorize("admin", "organization", "volunteer"),
  controller.listHelpRequestAttendees(service, schema, repository));

module.exports = router;

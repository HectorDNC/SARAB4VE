/**
 * Rutas — definición del router de Express para emergency-attendees.
 */
const express = require("express");
const controller = require("./emergencyAttendees.controller");
const service = require("./emergencyAttendees.service");
const repository = require("./emergencyAttendees.repository");
const schema = require("./emergencyAttendees.schema");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router({ mergeParams: true });

router.post("/",
  authenticate, authorize("admin", "organization", "volunteer"),
  controller.createEmergencyAttendee(service, schema, repository));
router.get("/",
  authenticate, authorize("admin", "organization", "volunteer"),
  controller.listEmergencyAttendees(service, schema, repository));

module.exports = router;

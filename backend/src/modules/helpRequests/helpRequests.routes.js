/**
 * Rutas — definición del router de Express para help-requests.
 */
const express = require("express");
const controller = require("./helpRequests.controller");
const service = require("./helpRequests.service");
const repository = require("./helpRequests.repository");
const schema = require("./helpRequests.schema");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

router.get("/", authenticate, authorize("admin", "organization", "volunteer"), controller.listHelpRequests(service, repository, schema));
router.post("/", authenticate, controller.createHelpRequest(service, schema, repository));
router.post("/:id/accept", authenticate, authorize("admin", "organization"), controller.acceptHelpRequest(service, schema, repository));
router.post("/:id/resolve", authenticate, authorize("admin", "organization"), controller.resolveHelpRequest(service, schema, repository));

module.exports = router;

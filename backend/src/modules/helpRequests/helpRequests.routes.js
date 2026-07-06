/**
 * Rutas — definición del router de Express para help-requests.
 */
const express = require("express");
const controller = require("./helpRequests.controller");
const service = require("./helpRequests.service");
const repository = require("./helpRequests.repository");
const schema = require("./helpRequests.schema");

const router = express.Router();

router.get("/", controller.listHelpRequests(service, repository, schema));
router.post("/", controller.createHelpRequest(service, schema, repository));
router.post("/:id/accept", controller.acceptHelpRequest(service, schema, repository));
router.post("/:id/resolve", controller.resolveHelpRequest(service, schema, repository));

module.exports = router;

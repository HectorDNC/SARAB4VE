/**
 * Rutas — definición del router de Express para emergencias.
 */
const express = require("express");
const controller = require("./emergencies.controller");
const service = require("./emergencies.service");
const repository = require("./emergencies.repository");
const schema = require("./emergencies.schema");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

router.get("/", 
    authenticate, authorize("admin", "organization", "volunteer"), 
    controller.listEmergencies(service, repository, schema));
router.get("/:id", 
    authenticate, authorize("admin", "organization", "volunteer"), 
    controller.getEmergencyById(service, schema, repository));
router.post("/", controller.createEmergency(service, schema));

module.exports = router;

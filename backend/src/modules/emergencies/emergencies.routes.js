/**
 * Rutas — definición del router de Express para emergencias.
 */
const express = require("express");
const controller = require("./emergencies.controller");
const service = require("./emergencies.service");
const repository = require("./emergencies.repository");
const schema = require("./emergencies.schema");

const router = express.Router();

router.get("/", controller.listEmergencies(service, repository, schema));
router.post("/", controller.createEmergency(service, schema));

module.exports = router;

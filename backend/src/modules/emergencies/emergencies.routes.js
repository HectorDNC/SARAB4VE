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

// ── Voz ──
const {
  EmergenciaVozSchema,
  createEmergencyVoiceHandler,
  handleMulterUpload,
} = require("./emergencies.voice");

const router = express.Router();

router.get("/", 
    authenticate, authorize("admin", "organization", "volunteer"), 
    controller.listEmergencies(service, repository, schema));
router.get("/:id", 
    authenticate, authorize("admin", "organization", "volunteer"), 
    controller.getEmergencyById(service, schema, repository));

// ── Estado de procesamiento asíncrono ──
router.get("/:id/processing-status",
    authenticate, authorize("admin", "organization", "volunteer"),
    controller.getProcessingStatus(service, schema, repository));

router.post("/", controller.createEmergency(service, schema));

// ── Voz: reporte con audio + transcripción (autenticado, cualquier rol) ──
router.post("/voice",
    handleMulterUpload,
    createEmergencyVoiceHandler(EmergenciaVozSchema));

module.exports = router;

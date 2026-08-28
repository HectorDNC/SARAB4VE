/**
 * Rutas — definición del router de Express para auth (registro + login).
 */
const express = require("express");
const controller = require("./auth.controller");
const service = require("./auth.service");
const repository = require("./auth.repository");
const schema = require("./auth.schema");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

// Registro de ciudadano (aprobación automática, sin fricción)
router.post(
  "/register/citizen",
  controller.registerCitizen(service, schema, repository),
);

// Registro de voluntario (requiere skills, availability, terms)
router.post(
  "/register/volunteer",
  controller.registerVolunteer(service, schema, repository),
);

// Registro de organización (requiere datos legales)
router.post(
  "/register/organization",
  controller.registerOrganization(service, schema, repository),
);

// Registro de administrador
router.post(
  "/register/admin",
  authenticate, authorize("admin"),
  controller.registerAdmin(service, schema, repository),
);

// Inicio de sesión (público)
router.post(
  "/login",
  controller.login(service, schema, repository),
);

// Perfil del usuario autenticado (requiere token)
router.get(
  "/me",
  authenticate,
  controller.me(service, repository),
);

// Validar token de completar registro (público — el solicitante aún no tiene sesión)
router.get(
  "/validate-completion-token",
  controller.validateCompletionToken(service, schema, repository),
);

// Completar registro definiendo la contraseña (público)
router.post(
  "/complete-registration",
  controller.completeRegistration(service, schema, repository),
);

module.exports = router;

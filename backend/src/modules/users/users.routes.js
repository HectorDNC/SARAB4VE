/**
 * Rutas — definición del router de Express para administración de usuarios.
 */
const express = require("express");
const controller = require("./users.controller");
const service = require("./users.service");
const repository = require("./users.repository");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

// GET /api/users — Listar usuarios (solo admin)
router.get(
  "/",
  authenticate,
  authorize("admin"),
  controller.listUsers(service, repository),
);

// GET /api/users/:id — Obtener usuario por ID
// Accesible por admin o por el propio usuario (el servicio verifica permisos)
router.get(
  "/:id",
  authenticate,
  controller.getUserById(service, repository),
);

// PATCH /api/users/:id — Actualizar usuario
// Accesible por admin o por el propio usuario (el servicio verifica permisos)
router.patch(
  "/:id",
  authenticate,
  controller.updateUser(service, repository),
);

// POST /api/users/:id/approve — Aprobar usuario (solo admin)
router.post(
  "/:id/approve",
  authenticate,
  authorize("admin"),
  controller.approveUser(service, repository),
);

// POST /api/users/:id/reject — Rechazar usuario (solo admin)
router.post(
  "/:id/reject",
  authenticate,
  authorize("admin"),
  controller.rejectUser(service, repository),
);

// GET /api/users/:id/organization-profile — Obtener perfil completo de organización (solo admin)
// Retorna: datos de usuario, perfil extendido, representantes legales,
// tipos de discapacidad, servicios, verificación y documentos
router.get(
  "/:id/organization-profile",
  authenticate,
  authorize("admin"),
  controller.getOrganizationProfile(service, repository),
);

module.exports = router;

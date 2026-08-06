/**
 * Rutas — definición del router de Express para el módulo de verificación.
 *
 * Cubre:
 *   - Catálogo unificado (público, con autenticación)
 *   - Registro de organizaciones
 *   - Registro de voluntarios
 *   - Documentos de verificación
 *   - Panel de administración (revisión y transiciones)
 */
const express = require("express");
const multer = require("multer");
const controller = require("./verification.controller");
const service = require("./verification.service");
const repository = require("./verification.repository");
const schema = require("./verification.schema");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

// ---------------------------------------------------------------------------
// Catálogo unificado (requiere autenticación)
// ---------------------------------------------------------------------------

router.get(
  "/catalog",
  authenticate,
  controller.getCatalog(service, repository),
);

// ---------------------------------------------------------------------------
// Registro de Organización (requiere autenticación)
// ---------------------------------------------------------------------------

router.post(
  "/organizations/register",
  authenticate,
  controller.registerOrganization(service, schema, repository),
);

// ---------------------------------------------------------------------------
// Registro de Voluntario (requiere autenticación)
// ---------------------------------------------------------------------------

router.post(
  "/volunteers/register",
  authenticate,
  controller.registerVolunteer(service, schema, repository),
);

// ---------------------------------------------------------------------------
// Estado de verificación del usuario autenticado
// ---------------------------------------------------------------------------

router.get(
  "/verification/status",
  authenticate,
  controller.getMyVerificationStatus(service, repository),
);

// ---------------------------------------------------------------------------
// Documentos de verificación
// ---------------------------------------------------------------------------

// Multer — middleware para recibir el archivo en memoria
const uploadDocumentMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("file");

// Wrapper para capturar errores de multer
function handleDocumentUpload(req, res, next) {
  uploadDocumentMulter(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          errors: ["El archivo excede el tamaño máximo permitido (10 MB)"],
        });
      }
      return res.status(400).json({ errors: [err.message] });
    }
    next();
  });
}

// Subir documento (multipart/form-data: "file" + "documentTypeId")
router.post(
  "/verification-documents",
  authenticate,
  handleDocumentUpload,
  controller.uploadDocument(service, repository),
);

// Checklist de documentos de un usuario
router.get(
  "/verification-documents/:ownerId",
  authenticate,
  controller.getDocumentChecklist(service, repository),
);

// Revisar documento (solo admin)
router.patch(
  "/verification-documents/:id/review",
  authenticate,
  authorize("admin"),
  controller.reviewDocument(service, repository),
);

// ---------------------------------------------------------------------------
// Panel de administración (solo admin)
// ---------------------------------------------------------------------------

// Cola de revisión
router.get(
  "/admin/verifications",
  authenticate,
  authorize("admin"),
  controller.listAdminVerifications(service, repository),
);

// Transicionar estado
router.patch(
  "/admin/verifications/:id/transition",
  authenticate,
  authorize("admin"),
  controller.transitionVerification(service, repository),
);

module.exports = router;

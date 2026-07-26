/**
 * Rutas — definición del router de Express para mensajes.
 * Montado en /api/messages (separado de /api/conversations).
 */
const express = require("express");
const controller = require("./conversations.controller");
const messagesService = require("./messages.service");
const messagesRepository = require("./messages.repository");
const schema = require("./conversations.schema");
const { hybridAuth } = require("../../middleware/requireCitizenToken");

const router = express.Router();

// PATCH /api/messages/:id/read — marca mensaje como leído (JWT o token)
router.patch(
  "/:id/read",
  hybridAuth,
  controller.markMessageRead(messagesService, messagesRepository, schema),
);

module.exports = router;

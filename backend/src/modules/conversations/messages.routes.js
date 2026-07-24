/**
 * Rutas — definición del router de Express para mensajes.
 * Montado en /api/messages (separado de /api/conversations).
 */
const express = require("express");
const controller = require("./conversations.controller");
const messagesService = require("./messages.service");
const messagesRepository = require("./messages.repository");
const schema = require("./conversations.schema");
const { authenticate } = require("../../middleware/authenticate");
const { requireCitizenToken } = require("../../middleware/requireCitizenToken");

// Servicio WebSocket (opcional)
let websocketService = null;
try {
  websocketService = require("../../services/websocket");
} catch (error) {
  console.warn("[messages.routes] WebSocket service no disponible:", error.message);
}

const router = express.Router();

// PATCH /api/messages/:id/read — marca mensaje como leído (JWT o token)
router.patch(
  "/:id/read",
  (req, res, next) => {
    // Middleware híbrido: acepta JWT o token de ciudadano
    authenticate(req, res, (err) => {
      if (err || !req.user) {
        requireCitizenToken(req, res, next);
      } else {
        next();
      }
    });
  },
  controller.markMessageRead(messagesService, messagesRepository, schema),
);

module.exports = router;

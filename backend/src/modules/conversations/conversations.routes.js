/**
 * Rutas — definición del router de Express para el dominio de chat.
 */
const express = require("express");
const controller = require("./conversations.controller");
const conversationsService = require("./conversations.service");
const messagesService = require("./messages.service");
const conversationsRepository = require("./conversations.repository");
const messagesRepository = require("./messages.repository");
const schema = require("./conversations.schema");
const { authenticate } = require("../../middleware/authenticate");
const { requireCitizenToken } = require("../../middleware/requireCitizenToken");

// Servicio WebSocket (opcional, puede ser null si no está inicializado)
let websocketService = null;
try {
  websocketService = require("../../services/websocket");
} catch (error) {
  console.warn("[conversations.routes] WebSocket service no disponible:", error.message);
}

const router = express.Router();

// GET /api/conversations — lista hilos del usuario autenticado (JWT)
router.get(
  "/",
  authenticate,
  controller.listForUser(conversationsService, conversationsRepository),
);

// GET /api/conversations/mine — lista hilos del ciudadano anónimo (token)
router.get(
  "/mine",
  requireCitizenToken,
  controller.listForCitizen(conversationsRepository),
);

// GET /api/conversations/:id/messages — lista mensajes (JWT o token)
router.get(
  "/:id/messages",
  (req, res, next) => {
    // Middleware híbrido: acepta JWT o token de ciudadano
    authenticate(req, res, (err) => {
      if (err || !req.user) {
        // Si falla JWT, intentar con token de ciudadano
        requireCitizenToken(req, res, next);
      } else {
        next();
      }
    });
  },
  controller.listMessages(
    messagesService,
    conversationsRepository,
    messagesRepository,
    schema,
  ),
);

// POST /api/conversations/:id/messages — envía mensaje (JWT o token)
router.post(
  "/:id/messages",
  (req, res, next) => {
    // Middleware híbrido: acepta JWT o token de ciudadano
    authenticate(req, res, (err) => {
      if (err || !req.user) {
        // Si falla JWT, intentar con token de ciudadano
        requireCitizenToken(req, res, next);
      } else {
        next();
      }
    });
  },
  controller.sendMessage(
    messagesService,
    conversationsRepository,
    messagesRepository,
    schema,
    websocketService,
  ),
);

// PATCH /api/messages/:id/read — marca mensaje como leído (JWT o token)
router.patch(
  "/messages/:id/read",
  (req, res, next) => {
    // Middleware híbrido: acepta JWT o token de ciudadano
    authenticate(req, res, (err) => {
      if (err || !req.user) {
        // Si falla JWT, intentar con token de ciudadano
        requireCitizenToken(req, res, next);
      } else {
        next();
      }
    });
  },
  controller.markMessageRead(messagesService, messagesRepository, schema),
);

module.exports = router;

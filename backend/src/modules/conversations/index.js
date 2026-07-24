/**
 * Conversations module — chat system for emergencies and help requests.
 * 
 * This module enables real-time messaging between:
 * - Volunteers/organizations (authenticated via JWT)
 * - Citizens (anonymous, authenticated via access token)
 * 
 * Main components:
 * - conversations: threads associated with emergencies or help requests
 * - messages: individual messages within conversations
 * - access_token: token that allows citizens to participate without registration
 */

const conversationsRoutes = require("./conversations.routes");
const messagesRoutes = require("./messages.routes");
const conversationsService = require("./conversations.service");
const messagesService = require("./messages.service");
const conversationsRepository = require("./conversations.repository");
const messagesRepository = require("./messages.repository");

module.exports = {
  conversationsRoutes,
  messagesRoutes,
  conversationsService,
  messagesService,
  conversationsRepository,
  messagesRepository,
};

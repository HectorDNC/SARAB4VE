/**
 * Servicio WebSocket para notificaciones en tiempo real.
 * Permite al frontend suscribirse a actualizaciones de estado de emergencias.
 */

const WebSocket = require('ws');

let wss = null;
const clients = new Map(); // emergencyId -> Set<ws>
const lastState = new Map(); // emergencyId -> último estado de procesamiento

// ── Chat (conversations) ──
const chatClients = new Map(); // conversationId -> Set<ws>

// ── Lista de conversaciones por usuario ──
const userListClients = new Map(); // userId -> Set<ws>
const citizenListClients = new Map(); // emergencyId -> Set<ws>

/**
 * Inicializa el servidor WebSocket.
 * @param {import('http').Server} server - Servidor HTTP de Express
 */
function initWebSocketServer(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WS] Cliente conectado');

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      console.log('[WS] Cliente desconectado');
      
      // Limpiar suscripciones a emergencias
      for (const [emergencyId, clientSet] of clients.entries()) {
        clientSet.delete(ws);
        if (clientSet.size === 0) clients.delete(emergencyId);
      }
      
      // Limpiar suscripciones a conversaciones de chat
      for (const [conversationId, clientSet] of chatClients.entries()) {
        clientSet.delete(ws);
        if (clientSet.size === 0) chatClients.delete(conversationId);
      }

      // Limpiar suscripciones a lista de conversaciones de usuario
      for (const [userId, clientSet] of userListClients.entries()) {
        clientSet.delete(ws);
        if (clientSet.size === 0) userListClients.delete(userId);
      }

      // Limpiar suscripciones a lista de conversaciones de ciudadano
      for (const [emergencyId, clientSet] of citizenListClients.entries()) {
        clientSet.delete(ws);
        if (clientSet.size === 0) citizenListClients.delete(emergencyId);
      }
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // ── Suscripción a actualizaciones de una emergencia ──
        if (data.type === 'subscribe' && data.emergencyId) {
          if (!clients.has(data.emergencyId)) {
            clients.set(data.emergencyId, new Set());
          }
          const clientSet = clients.get(data.emergencyId);
          if (clientSet) {
            clientSet.add(ws);
            console.log(`[WS] Cliente suscrito a emergencia ${data.emergencyId}`);

            // Enviar confirmación de suscripción
            ws.send(JSON.stringify({
              type: 'subscribed',
              emergencyId: data.emergencyId,
              timestamp: new Date().toISOString()
            }));

            // Enviar inmediatamente el último estado si existe (resuelve race condition)
            if (lastState.has(data.emergencyId)) {
              const cachedState = lastState.get(data.emergencyId);
              console.log(`[WS] Enviando estado cached para emergencia ${data.emergencyId}`);
              ws.send(JSON.stringify({
                type: 'emergency_update',
                emergencyId: data.emergencyId,
                data: cachedState,
                timestamp: new Date().toISOString()
              }));
            }
          }
        }

        // ── Desuscripción de emergencia ──
        if (data.type === 'unsubscribe' && data.emergencyId) {
          if (clients.has(data.emergencyId)) {
            clients.get(data.emergencyId).delete(ws);
            if (clients.get(data.emergencyId).size === 0) {
              clients.delete(data.emergencyId);
            }
          }
        }

        // ── Suscripción a conversación de chat ──
        if (data.type === 'subscribe_conversation' && data.conversationId) {
          subscribeToConversation(ws, data.conversationId);
          ws.send(JSON.stringify({
            type: 'subscribed_conversation',
            conversationId: data.conversationId,
            timestamp: new Date().toISOString()
          }));
        }

        // ── Desuscripción de conversación de chat ──
        if (data.type === 'unsubscribe_conversation' && data.conversationId) {
          unsubscribeFromConversation(ws, data.conversationId);
        }

        // ── Suscripción a lista de conversaciones del usuario ──
        if (data.type === 'subscribe_conversation_list') {
          if (data.userId) {
            subscribeToUserConversationList(ws, data.userId);
            ws.send(JSON.stringify({
              type: 'subscribed_conversation_list',
              userId: data.userId,
              timestamp: new Date().toISOString()
            }));
          } else if (data.emergencyId) {
            subscribeToCitizenConversationList(ws, data.emergencyId);
            ws.send(JSON.stringify({
              type: 'subscribed_conversation_list',
              emergencyId: data.emergencyId,
              timestamp: new Date().toISOString()
            }));
          }
        }

        // ── Desuscripción de lista de conversaciones ──
        if (data.type === 'unsubscribe_conversation_list') {
          if (data.userId) {
            unsubscribeFromUserConversationList(ws, data.userId);
          } else if (data.emergencyId) {
            unsubscribeFromCitizenConversationList(ws, data.emergencyId);
          }
        }
      } catch (error) {
        console.error('[WS] Error procesando mensaje:', error);
      }
    });
  });

  // Heartbeat para detectar conexiones muertas
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('[WS] Servidor WebSocket inicializado en /ws');
}

/**
 * Envía una actualización de estado a todos los clientes suscritos a una emergencia.
 *
 * Esta función es defensiva: NUNCA lanza excepciones. Si el servidor WS no
 * está inicializado, si la serialización JSON falla, o si algún cliente está
 * en un estado inválido, el error se registra y se continúa. La idea es que
 * el canal de notificaciones en tiempo real sea estrictamente best-effort y
 * NUNCA afecte al flujo principal de procesamiento de emergencias.
 *
 * @param {string} emergencyId
 * @param {Object} data
 */
function notifyEmergencyUpdate(emergencyId, data) {
  try {
    if (!wss) {
      console.warn(`[WS] notifyEmergencyUpdate llamado sin servidor WS inicializado (${emergencyId})`);
      return;
    }

    // Almacenar el último estado para enviarlo a clientes que se suscriban después
    lastState.set(emergencyId, data);

    if (!clients.has(emergencyId)) {
      console.log(`[WS] No hay clientes suscritos para emergencia ${emergencyId}, estado guardado en cache`);
      return;
    }

    const message = JSON.stringify({
      type: 'emergency_update',
      emergencyId,
      data,
      timestamp: new Date().toISOString()
    });

    const clientSet = clients.get(emergencyId);
    if (!clientSet) return;

    let sentCount = 0;
    for (const ws of clientSet) {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        }
      } catch (sendErr) {
        console.error(`[WS] Error enviando a cliente (continuando):`, sendErr.message);
      }
    }

    if (sentCount > 0) {
      console.log(`[WS] Notificación enviada a ${sentCount} cliente(s) para emergencia ${emergencyId}`);
    }
  } catch (err) {
    console.error(`[WS] Error en notifyEmergencyUpdate (no fatal):`, err?.message || err);
  }
}

/**
 * Obtiene el número de clientes conectados.
 * @returns {number}
 */
function getConnectedClients() {
  return wss ? wss.clients.size : 0;
}

/**
 * Cierra el servidor WebSocket.
 */
function closeWebSocketServer() {
  if (wss) {
    wss.close();
    wss = null;
    clients.clear();
    lastState.clear();
    chatClients.clear();
    userListClients.clear();
    citizenListClients.clear();
    console.log('[WS] Servidor WebSocket cerrado');
  }
}

// ── Chat (conversations) ──

/**
 * Suscribe un cliente WebSocket a una conversación.
 * @param {WebSocket} ws - Cliente WebSocket
 * @param {string} conversationId - ID de la conversación
 */
function subscribeToConversation(ws, conversationId) {
  if (!chatClients.has(conversationId)) {
    chatClients.set(conversationId, new Set());
  }
  const clientSet = chatClients.get(conversationId);
  clientSet.add(ws);
  console.log(`[WS] Cliente suscrito a conversación ${conversationId}`);
}

/**
 * Desuscribe un cliente WebSocket de una conversación.
 * @param {WebSocket} ws - Cliente WebSocket
 * @param {string} conversationId - ID de la conversación
 */
function unsubscribeFromConversation(ws, conversationId) {
  if (chatClients.has(conversationId)) {
    chatClients.get(conversationId).delete(ws);
    if (chatClients.get(conversationId).size === 0) {
      chatClients.delete(conversationId);
    }
  }
}

/**
 * Notifica a todos los clientes suscritos sobre un nuevo mensaje.
 * @param {string} conversationId - ID de la conversación
 * @param {Object} message - Mensaje creado
 */
function notifyNewMessage(conversationId, message) {
  try {
    if (!chatClients.has(conversationId)) {
      return;
    }

    const payload = JSON.stringify({
      type: 'new_message',
      conversationId,
      message,
    });

    const clientSet = chatClients.get(conversationId);
    let sentCount = 0;

    for (const ws of clientSet) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      console.log(`[WS] Nuevo mensaje notificado a ${sentCount} cliente(s) en conversación ${conversationId}`);
    }
  } catch (err) {
    console.error('[WS] Error en notifyNewMessage:', err.message);
  }
}

/**
 * Notifica a todos los clientes suscritos sobre un mensaje marcado como leído.
 * @param {string} conversationId - ID de la conversación
 * @param {Object} message - Mensaje actualizado
 */
function notifyMessageRead(conversationId, message) {
  try {
    if (!chatClients.has(conversationId)) {
      return;
    }

    const payload = JSON.stringify({
      type: 'message_read',
      conversationId,
      message,
    });

    const clientSet = chatClients.get(conversationId);
    let sentCount = 0;

    for (const ws of clientSet) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      console.log(`[WS] Mensaje leído notificado a ${sentCount} cliente(s) en conversación ${conversationId}`);
    }
  } catch (err) {
    console.error('[WS] Error en notifyMessageRead:', err.message);
  }
}

// ── Lista de conversaciones por usuario ──

/**
 * Suscribe un cliente WebSocket a la lista de conversaciones de un usuario autenticado.
 * @param {WebSocket} ws - Cliente WebSocket
 * @param {string} userId - ID del usuario autenticado
 */
function subscribeToUserConversationList(ws, userId) {
  if (!userListClients.has(userId)) {
    userListClients.set(userId, new Set());
  }
  const clientSet = userListClients.get(userId);
  clientSet.add(ws);
  console.log(`[WS] Cliente suscrito a lista de conversaciones de usuario ${userId}`);
}

/**
 * Desuscribe un cliente WebSocket de la lista de conversaciones de un usuario autenticado.
 * @param {WebSocket} ws - Cliente WebSocket
 * @param {string} userId - ID del usuario autenticado
 */
function unsubscribeFromUserConversationList(ws, userId) {
  if (userListClients.has(userId)) {
    userListClients.get(userId).delete(ws);
    if (userListClients.get(userId).size === 0) {
      userListClients.delete(userId);
    }
  }
}

/**
 * Suscribe un cliente WebSocket a la lista de conversaciones de un ciudadano anónimo.
 * @param {WebSocket} ws - Cliente WebSocket
 * @param {string} emergencyId - ID de la emergencia del ciudadano
 */
function subscribeToCitizenConversationList(ws, emergencyId) {
  if (!citizenListClients.has(emergencyId)) {
    citizenListClients.set(emergencyId, new Set());
  }
  const clientSet = citizenListClients.get(emergencyId);
  clientSet.add(ws);
  console.log(`[WS] Cliente suscrito a lista de conversaciones de emergencia ${emergencyId}`);
}

/**
 * Desuscribe un cliente WebSocket de la lista de conversaciones de un ciudadano anónimo.
 * @param {WebSocket} ws - Cliente WebSocket
 * @param {string} emergencyId - ID de la emergencia del ciudadano
 */
function unsubscribeFromCitizenConversationList(ws, emergencyId) {
  if (citizenListClients.has(emergencyId)) {
    citizenListClients.get(emergencyId).delete(ws);
    if (citizenListClients.get(emergencyId).size === 0) {
      citizenListClients.delete(emergencyId);
    }
  }
}

/**
 * Notifica a todos los clientes suscritos que la lista de conversaciones ha cambiado.
 * Notifica tanto a usuarios autenticados (attendedBy) como a ciudadanos (emergencyId).
 * @param {Object} conversation - Conversación creada o modificada
 * @param {string} conversation.id - ID de la conversación
 * @param {string|null} conversation.emergencyId - ID de la emergencia (si aplica)
 * @param {string|null} conversation.helpRequestId - ID del help request (si aplica)
 * @param {string} conversation.attendedBy - ID del usuario que atiende
 * @param {string} conversation.status - Estado de la conversación
 * @param {string} conversation.createdAt - Fecha de creación
 * @param {string} conversation.updatedAt - Fecha de actualización
 */
function notifyConversationListUpdate(conversation) {
  try {
    const payload = JSON.stringify({
      type: 'conversation_list_update',
      conversation,
    });

    let sentCount = 0;

    // Notificar al usuario autenticado (attendedBy)
    if (conversation.attendedBy && userListClients.has(conversation.attendedBy)) {
      const clientSet = userListClients.get(conversation.attendedBy);
      for (const ws of clientSet) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
          sentCount++;
        }
      }
    }

    // Notificar al ciudadano (emergencyId)
    if (conversation.emergencyId && citizenListClients.has(conversation.emergencyId)) {
      const clientSet = citizenListClients.get(conversation.emergencyId);
      for (const ws of clientSet) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
          sentCount++;
        }
      }
    }

    if (sentCount > 0) {
      console.log(`[WS] Lista de conversaciones actualizada para ${sentCount} cliente(s) (conversación ${conversation.id})`);
    }
  } catch (err) {
    console.error('[WS] Error en notifyConversationListUpdate:', err.message);
  }
}

module.exports = {
  initWebSocketServer,
  notifyEmergencyUpdate,
  getConnectedClients,
  closeWebSocketServer,
  subscribeToConversation,
  unsubscribeFromConversation,
  notifyNewMessage,
  notifyMessageRead,
  subscribeToUserConversationList,
  unsubscribeFromUserConversationList,
  subscribeToCitizenConversationList,
  unsubscribeFromCitizenConversationList,
  notifyConversationListUpdate,
};

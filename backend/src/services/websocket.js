/**
 * Servicio WebSocket para notificaciones en tiempo real.
 * Permite al frontend suscribirse a actualizaciones de estado de emergencias.
 */

const WebSocket = require('ws');

let wss = null;
const clients = new Map(); // emergencyId -> Set<ws>
const lastState = new Map(); // emergencyId -> último estado de procesamiento

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
      for (const [emergencyId, clientSet] of clients.entries()) {
        clientSet.delete(ws);
        if (clientSet.size === 0) clients.delete(emergencyId);
      }
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Suscripción a actualizaciones de una emergencia
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

        // Desuscripción
        if (data.type === 'unsubscribe' && data.emergencyId) {
          if (clients.has(data.emergencyId)) {
            clients.get(data.emergencyId).delete(ws);
            if (clients.get(data.emergencyId).size === 0) {
              clients.delete(data.emergencyId);
            }
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
    console.log('[WS] Servidor WebSocket cerrado');
  }
}

module.exports = {
  initWebSocketServer,
  notifyEmergencyUpdate,
  getConnectedClients,
  closeWebSocketServer
};

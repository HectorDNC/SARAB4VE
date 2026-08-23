"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { API } from "@/api/client";

// ── Tipos ────────────────────────────────────────────────────────────────────

type SocketStatus = "connecting" | "open" | "closing" | "closed";

interface SocketMessage {
  type: string;
  [key: string]: unknown;
}

type MessageHandler = (data: SocketMessage) => void;

interface ChatSocketContextValue {
  status: SocketStatus;
  /** Suscribe a una conversación. Retorna cleanup. */
  subscribe: (conversationId: string) => () => void;
  /** Suscribe a la lista de conversaciones del usuario. Retorna cleanup. */
  subscribeToList: (params: { userId?: string; emergencyId?: string }) => () => void;
  /** Registra handler global de mensajes. */
  onMessage: (handler: MessageHandler) => () => void;
  /** Fuerza una reconexión. Útil tras login/guardado de token en la misma pestaña. */
  forceReconnect: () => void;
}

// ── Contexto ─────────────────────────────────────────────────────────────────

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error("useChatSocket debe usarse dentro de ChatSocketProvider");
  }
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provider singleton para WebSocket de chat.
 * Comparte una sola conexión entre todos los componentes que la necesiten.
 * Reconexión automática con backoff exponencial.
 */
export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SocketStatus>("closed");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const backoffRef = useRef(1000); // 1s inicial
  const MAX_BACKOFF = 15000; // 15s máximo
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const subscriptionsRef = useRef<Map<string, number>>(new Map()); // conversationId -> refCount
  const listSubscriptionsRef = useRef<Map<string, { userId?: string; emergencyId?: string }>>(new Map()); // subscriptionKey -> params

  // Obtener token de acceso (ciudadano anónimo) o JWT
  const getAuthToken = useCallback(() => {
    // Prioridad: JWT > access_token en localStorage
    const jwt = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("emergencyAccessToken") : null;
    
    if (jwt) {
      return { type: "jwt", token: jwt };
    }
    if (accessToken) {
      return { type: "citizen", token: accessToken };
    }
    return null;
  }, []);

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    const auth = getAuthToken();
    if (!auth) {
      setStatus("closed");
      return;
    }

    // Limpiar timer de reconexión si existe
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setStatus("connecting");

    // Construir URL con parámetros de autenticación
    const wsUrl = new URL(API.replace(/^http/, "ws") + "/ws");
    if (auth.type === "jwt") {
      wsUrl.searchParams.set("jwt", auth.token);
    } else {
      wsUrl.searchParams.set("t", auth.token);
    }

    try {
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[ChatWS] Conectado");
        setStatus("open");
        backoffRef.current = 1000; // Reset backoff

        // Re-suscribirse automáticamente a todas las conversaciones
        // para las que tenemos un refCount > 0. Esto cubre el caso de
        // reconexión tras cambio de token o tras una desconexión.
        for (const [conversationId, refCount] of subscriptionsRef.current.entries()) {
          if (refCount > 0) {
            try {
              ws.send(JSON.stringify({
                type: "subscribe_conversation",
                conversationId,
              }));
              console.log(`[ChatWS] Re-suscrito a conversación ${conversationId}`);
            } catch (err) {
              console.error("[ChatWS] Error re-suscribiendo:", err);
            }
          }
        }

        // Re-suscribirse a listas de conversaciones
        for (const [, params] of listSubscriptionsRef.current.entries()) {
          try {
            const msg: Record<string, string> = { type: "subscribe_conversation_list" };
            if (params.userId) msg.userId = params.userId;
            if (params.emergencyId) msg.emergencyId = params.emergencyId;
            ws.send(JSON.stringify(msg));
            console.log(`[ChatWS] Re-suscrito a lista de conversaciones`, params);
          } catch (err) {
            console.error("[ChatWS] Error re-suscribiendo a lista:", err);
          }
        }
      };

      ws.onclose = (event) => {
        console.log("[ChatWS] Cerrado", event.code, event.reason);
        wsRef.current = null;
        setStatus("closed");

        // Reconexión automática (no si fue cierre intencional 1000)
        if (event.code !== 1000) {
          const delay = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
          console.log(`[ChatWS] Reconectando en ${delay}ms...`);
          reconnectTimerRef.current = window.setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.error("[ChatWS] Error:", err);
        // Usar 1000 (cierre normal) para evitar InvalidAccessError,
        // ya que 1011 no es un código válido en navegadores.
        try { ws.close(1000, "Error de conexión"); } catch (_) { /* noop */ }
      };

      ws.onmessage = (event) => {
        try {
          const data: SocketMessage = JSON.parse(event.data);
          handlersRef.current.forEach((handler) => handler(data));
        } catch (err) {
          console.error("[ChatWS] Error parseando mensaje:", err);
        }
      };
    } catch (err) {
      console.error("[ChatWS] Error creando WebSocket:", err);
      setStatus("closed");
    }
  }, [getAuthToken]);

  // Conectar al montar y reaccionar a cambios en el token
  useEffect(() => {
    connect();

    // ── Reconectar cuando aparezca un token nuevo ──
    // Caso típico: usuario crea una emergencia por voz → se guarda
    // `emergencyAccessToken` en localStorage. Sin este listener el WS
    // nunca se conecta porque al montar no había token.
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === "emergencyAccessToken" ||
        event.key === "token" ||
        event.key === null // clear() también dispara con key=null
      ) {
        console.log("[ChatWS] Cambio en localStorage, reconectando…", event.key);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        if (wsRef.current) {
          try { wsRef.current.close(1000, "Reconectando tras cambio de token"); } catch (_) { /* noop */ }
          wsRef.current = null;
        }
        backoffRef.current = 1000;
        connect();
      }
    };
    window.addEventListener("storage", onStorage);

    // ── Evento custom en la misma pestaña ──
    // Disparado por ButtonEmergencyVoice / sos/page cuando guardan
    // el accessToken. El evento `storage` solo se dispara en otras
    // pestañas, así que necesitamos este canal adicional.
    const onAuthTokenChanged = () => {
      console.log("[ChatWS] sara:auth-token-changed, reconectando…");
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(1000, "Reconectando tras cambio de token"); } catch (_) { /* noop */ }
        wsRef.current = null;
      }
      backoffRef.current = 1000;
      connect();
    };
    window.addEventListener("sara:auth-token-changed", onAuthTokenChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sara:auth-token-changed", onAuthTokenChanged);
      // Cleanup: cerrar conexión intencionalmente
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Componente desmontado");
      }
    };
  }, [connect]);

  // Suscribirse a una conversación
  const subscribe = useCallback((conversationId: string) => {
    // Incrementar refCount aunque el socket no esté abierto todavía.
    // Cuando (re)conecte, onopen reenviará TODAS las suscripciones
    // pendientes iterando sobre subscriptionsRef.
    const currentCount = subscriptionsRef.current.get(conversationId) || 0;
    subscriptionsRef.current.set(conversationId, currentCount + 1);

    // Intentar enviar la suscripción inmediatamente si el socket está abierto
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && currentCount === 0) {
      try {
        ws.send(JSON.stringify({
          type: "subscribe_conversation",
          conversationId,
        }));
      } catch (err) {
        console.error("[ChatWS] Error al suscribir:", err);
      }
    } else if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "[ChatWS] Socket no abierto aún, suscripción diferida para",
        conversationId,
      );
    }

    // Cleanup: desuscribir
    return () => {
      const count = subscriptionsRef.current.get(conversationId) || 0;
      const newCount = count - 1;

      if (newCount <= 0) {
        subscriptionsRef.current.delete(conversationId);
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          try {
            currentWs.send(JSON.stringify({
              type: "unsubscribe_conversation",
              conversationId,
            }));
          } catch (err) {
            console.error("[ChatWS] Error al desuscribir:", err);
          }
        }
      } else {
        subscriptionsRef.current.set(conversationId, newCount);
      }
    };
  }, []);

  // Suscribirse a la lista de conversaciones (usuario o ciudadano)
  const subscribeToList = useCallback((params: { userId?: string; emergencyId?: string }) => {
    const key = params.userId ? `user:${params.userId}` : `citizen:${params.emergencyId}`;

    // Si ya está suscrito, no duplicar
    if (listSubscriptionsRef.current.has(key)) {
      return () => {
        // Cleanup: no hacer nada si otro componente aún necesita la suscripción
      };
    }

    listSubscriptionsRef.current.set(key, { ...params });

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const msg: Record<string, string> = { type: "subscribe_conversation_list" };
        if (params.userId) msg.userId = params.userId;
        if (params.emergencyId) msg.emergencyId = params.emergencyId;
        ws.send(JSON.stringify(msg));
        console.log(`[ChatWS] suscrito a lista de conversaciones`, params);
      } catch (err) {
        console.error("[ChatWS] Error al suscribir a lista:", err);
      }
    } else {
      console.warn("[ChatWS] Socket no abierto aún, suscripción a lista diferida", params);
    }

    // Cleanup: desuscribir
    return () => {
      listSubscriptionsRef.current.delete(key);
      const currentWs = wsRef.current;
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        try {
          const msg: Record<string, string> = { type: "unsubscribe_conversation_list" };
          if (params.userId) msg.userId = params.userId;
          if (params.emergencyId) msg.emergencyId = params.emergencyId;
          currentWs.send(JSON.stringify(msg));
        } catch (err) {
          console.error("[ChatWS] Error al desuscribir de lista:", err);
        }
      }
    };
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  // Forzar reconexión (p. ej. tras guardar token en la misma pestaña)
  const forceReconnect = useCallback(() => {
    console.log("[ChatWS] forceReconnect solicitado");
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(1000, "Reconexión forzada"); } catch (_) { /* noop */ }
      wsRef.current = null;
    }
    backoffRef.current = 1000;
    connect();
  }, [connect]);

  return (
    <ChatSocketContext.Provider value={{ status, subscribe, subscribeToList, onMessage, forceReconnect }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

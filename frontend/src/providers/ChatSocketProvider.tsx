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
  /** Registra handler global de mensajes. */
  onMessage: (handler: MessageHandler) => () => void;
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
  const MAX_BACKOFF = 30000; // 30s máximo
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const subscriptionsRef = useRef<Map<string, number>>(new Map()); // conversationId -> refCount

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
        ws.close(1011, "Error de conexión");
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

  // Conectar al montar
  useEffect(() => {
    connect();

    return () => {
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
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[ChatWS] No se puede suscribir, socket no está abierto");
      return () => {};
    }

    // Incrementar refCount
    const currentCount = subscriptionsRef.current.get(conversationId) || 0;
    subscriptionsRef.current.set(conversationId, currentCount + 1);

    // Enviar suscripción solo si es la primera vez
    if (currentCount === 0) {
      ws.send(JSON.stringify({
        type: "subscribe_conversation",
        conversationId,
      }));
    }

    // Cleanup: desuscribir
    return () => {
      const count = subscriptionsRef.current.get(conversationId) || 0;
      const newCount = count - 1;

      if (newCount <= 0) {
        subscriptionsRef.current.delete(conversationId);
        ws.send(JSON.stringify({
          type: "unsubscribe_conversation",
          conversationId,
        }));
      } else {
        subscriptionsRef.current.set(conversationId, newCount);
      }
    };
  }, []);

  // Registrar handler de mensajes
  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return (
    <ChatSocketContext.Provider value={{ status, subscribe, onMessage }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

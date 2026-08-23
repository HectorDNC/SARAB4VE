"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { listConversations, listCitizenConversations } from "@/api/conversations";
import { useChatSocket } from "@/providers/ChatSocketProvider";
import type { Conversation } from "@/types";

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Decodifica un JWT sin verificarlo (solo para obtener el payload en el cliente).
 * La verificación ya la hace el backend al recibir el token en la conexión WS.
 */
function decodeJwtPayload(token: string): { userId?: string; [key: string]: unknown } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Hook para obtener la lista de conversaciones.
 * Decide automáticamente el modo según la autenticación:
 * - Si hay JWT en localStorage → usa endpoint de usuario autenticado
 * - Si hay access token de emergencia → usa endpoint de ciudadano
 * - Si no hay ninguno → retorna array vacío
 *
 * Además se suscribe al WebSocket para recibir actualizaciones en tiempo real
 * cuando otro usuario crea una conversación que nos involucra.
 */
export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToList, onMessage, status: socketStatus } = useChatSocket();

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const jwt = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const accessToken = typeof window !== "undefined" ? localStorage.getItem("emergencyAccessToken") : undefined;
      const emergencyId = typeof window !== "undefined" ? localStorage.getItem("emergencyId") ?? undefined : undefined;

      let data: Conversation[] = [];

      if (jwt) {
        // Usuario autenticado (voluntario/organización)
        data = await listConversations();
      } else if (accessToken) {
        // Ciudadano anónimo — pasar emergencyId para optimizar validación
        data = await listCitizenConversations(accessToken, emergencyId);
      } else {
        // Sin autenticación
        setConversations([]);
        setIsLoading(false);
        return;
      }

      setConversations(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      console.error("[useConversations] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── WebSocket: suscripción a lista de conversaciones en tiempo real ──
  // Obtenemos la identidad del usuario actual para suscribirnos al canal correcto.
  const subscriptionParamsRef = useRef<{ userId?: string; emergencyId?: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const jwt = localStorage.getItem("token");
    const accessToken = localStorage.getItem("emergencyAccessToken");
    const emergencyId = localStorage.getItem("emergencyId");

    if (!jwt && !accessToken) return; // Sin autenticación, no suscribirse

    const params: { userId?: string; emergencyId?: string } = {};

    if (jwt) {
      // Extraer userId del JWT (decodificado, no verificado — el backend ya
      // verificó el token al establecer la conexión WS)
      const payload = decodeJwtPayload(jwt);
      if (payload?.userId) {
        params.userId = payload.userId;
      } else {
        // Fallback: si no hay userId en el payload, no suscribirse
        console.warn("[useConversations] No se encontró userId en el JWT");
        return;
      }
    } else if (accessToken && emergencyId) {
      // Ciudadano anónimo: suscribirse por emergencyId
      params.emergencyId = emergencyId;
    } else {
      return;
    }

    subscriptionParamsRef.current = params;
    const unsubscribe = subscribeToList(params);

    // Handler: cuando llega una nueva conversación, insertarla o actualizarla
    const handler = (data: { type: string; conversation?: Conversation }) => {
      if (data.type === "conversation_list_update" && data.conversation) {
        const newConv = data.conversation;
        setConversations((prev) => {
          const existingIdx = prev.findIndex((c) => c.id === newConv.id);
          if (existingIdx >= 0) {
            // Actualizar existente (p. ej. cambio de status)
            const updated = [...prev];
            updated[existingIdx] = newConv;
            return updated;
          }
          // Insertar al inicio (la más reciente primero, como el backend)
          return [newConv, ...prev];
        });
      }
    };

    const removeHandler = onMessage(handler);

    return () => {
      unsubscribe();
      removeHandler();
    };
  }, [subscribeToList, onMessage]);

  // ── Si el WS se cierra inesperadamente, re-fetch para no quedar desactualizado ──
  const prevSocketStatus = useRef(socketStatus);
  useEffect(() => {
    const wasOpen = prevSocketStatus.current === "open";
    prevSocketStatus.current = socketStatus;
    if (wasOpen && socketStatus === "closed") {
      // Pequeño delay para que el provider intente reconectar primero
      const timer = setTimeout(() => {
        void fetchConversations();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [socketStatus, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}

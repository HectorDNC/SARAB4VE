"use client";

import { useEffect, useState, useCallback } from "react";
import { listConversations, listCitizenConversations } from "@/api/conversations";
import type { Conversation } from "@/types";

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener la lista de conversaciones.
 * Decide automáticamente el modo según la autenticación:
 * - Si hay JWT en localStorage → usa endpoint de usuario autenticado
 * - Si hay access token de emergencia → usa endpoint de ciudadano
 * - Si no hay ninguno → retorna array vacío
 */
export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}

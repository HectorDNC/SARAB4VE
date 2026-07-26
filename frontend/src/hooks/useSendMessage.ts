"use client";

import { useCallback, useRef } from "react";
import { sendMessage } from "@/api/conversations";
import { markMessageAsRead } from "@/api/conversations";
import type { Message, MessageWithStatus } from "@/types";

interface UseSendMessageReturn {
  /**
   * Envía un mensaje con actualización optimista.
   * Retorna el id temporal para poder actualizar el estado.
   */
  send: (
    body: string,
    onOptimisticInsert: (tempMessage: MessageWithStatus) => void,
    onConfirm: (messageId: string, confirmedMessage: Message) => void,
    onFail: (tempId: string) => void,
  ) => Promise<string>;

  /** Marca un mensaje como leído (sin errores, silencioso). */
  markRead: (messageId: string) => Promise<void>;

  /** Reenvía un mensaje fallido. */
  retry: (
    tempId: string,
    body: string,
    onRetry: (tempId: string) => void,
    onConfirm: (messageId: string, confirmedMessage: Message) => void,
    onFail: (tempId: string) => void,
  ) => Promise<void>;
}

/**
 * Hook para enviar mensajes con patrón optimista.
 * - Inserta el mensaje en el estado local inmediatamente con status "sending"
 * - Lo envía al backend
 * - Si responde OK: actualiza con los datos reales (id real, timestamps)
 * - Si falla: marca como "failed" para permitir reintentar
 */
export function useSendMessage(conversationId: string | null): UseSendMessageReturn {
  // Contador para generar IDs temporales únicos
  const tempIdCounter = useRef(0);

  const generateTempId = useCallback(() => {
    return `temp_${Date.now()}_${++tempIdCounter.current}`;
  }, []);

  const send = useCallback(
    async (
      body: string,
      onOptimisticInsert: (tempMessage: MessageWithStatus) => void,
      onConfirm: (messageId: string, confirmedMessage: Message) => void,
      onFail: (tempId: string) => void,
    ): Promise<string> => {
      if (!conversationId) throw new Error("No hay conversationId");

      const tempId = generateTempId();
      const now = new Date().toISOString();

      // Insertar optimísticamente
      const tempMessage: MessageWithStatus = {
        id: tempId,
        conversationId,
        senderUserId: null, // Se actualizará cuando confirme
        body,
        createdAt: now,
        readAt: null,
        sendStatus: "sending",
      };

      onOptimisticInsert(tempMessage);

      try {
        const confirmed = await sendMessage(conversationId, body);
        onConfirm(tempId, confirmed);
        return confirmed.id;
      } catch (err) {
        console.error("[useSendMessage] Error enviando mensaje:", err);
        onFail(tempId);
        return tempId;
      }
    },
    [conversationId, generateTempId],
  );

  const markRead = useCallback(async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
    } catch (err) {
      // Silencioso — no interrumpir la UX por fallos de markRead
      console.warn("[useSendMessage] Error marcando como leído:", err);
    }
  }, []);

  const retry = useCallback(
    async (
      tempId: string,
      body: string,
      onRetry: (tempId: string) => void,
      onConfirm: (messageId: string, confirmedMessage: Message) => void,
      onFail: (tempId: string) => void,
    ) => {
      if (!conversationId) return;

      onRetry(tempId);

      try {
        const confirmed = await sendMessage(conversationId, body);
        onConfirm(tempId, confirmed);
      } catch (err) {
        console.error("[useSendMessage] Error reintentando:", err);
        onFail(tempId);
      }
    },
    [conversationId],
  );

  return { send, markRead, retry };
}

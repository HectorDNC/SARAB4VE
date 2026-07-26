"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { listMessages, sendMessage, markMessageAsRead } from "@/api/conversations";
import { useChatSocket } from "@/providers/ChatSocketProvider";
import type { Message, MessageWithStatus } from "@/types";

interface UseMessagesReturn {
  /** Todos los mensajes (incluye temporales con sendStatus). */
  messages: MessageWithStatus[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Envía un mensaje con patrón optimista (inserta local → API → confirma/revierte). */
  sendOptimistic: (body: string) => Promise<void>;
  /** Marca un mensaje como leído (silencioso). */
  markRead: (messageId: string) => Promise<void>;
}

/**
 * Hook unificado de mensajes: fetch, WebSocket, envío optimista y markRead.
 */
export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const tempIdCounter = useRef(0);
  const { subscribe, onMessage, status: socketStatus } = useChatSocket();

  // ── Fetch inicial ──
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    setError(null);
    cursorRef.current = null;
    try {
      // Backend retorna ORDER BY created_at ASC → [más antiguo, ..., más reciente]
      const data = await listMessages(conversationId, { limit: 50 });
      setMessages(data.map((m) => ({ ...m, sendStatus: "sent" as const })));
      setHasMore(data.length === 50);
      // Cursor → id del mensaje más antiguo del lote
      if (data.length > 0) cursorRef.current = data[0].id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // ── Paginación (carga más antiguos) ──
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || !cursorRef.current) return;
    try {
      // Backend retorna mensajes más antiguos que el cursor, en ASC
      const data = await listMessages(conversationId, {
        cursor: cursorRef.current,
        limit: 50,
      });
      // Prepend al inicio: los más antiguos van arriba
      setMessages((prev) => [
        ...data.map((m) => ({ ...m, sendStatus: "sent" as const })),
        ...prev,
      ]);
      setHasMore(data.length === 50);
      if (data.length > 0) cursorRef.current = data[0].id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }, [conversationId, hasMore]);

  const refresh = useCallback(async () => { await fetchMessages(); }, [fetchMessages]);

  // ── Envío optimista ──
  const sendOptimistic = useCallback(async (body: string) => {
    if (!conversationId) return;

    const tempId = `temp_${Date.now()}_${++tempIdCounter.current}`;
    const now = new Date().toISOString();

    const tempMessage: MessageWithStatus = {
      id: tempId,
      conversationId,
      senderUserId: null,
      body,
      createdAt: now,
      readAt: null,
      sendStatus: "sending",
    };

    // Insertar optimísticamente
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const confirmed = await sendMessage(conversationId, body);
      // Reemplazar temp con confirmado del backend
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...confirmed, sendStatus: "sent" as const } : m,
        ),
      );
    } catch {
      // Marcar como fallido
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, sendStatus: "failed" as const } : m,
        ),
      );
    }
  }, [conversationId]);

  // ── Mark read ──
  const markRead = useCallback(async (messageId: string) => {
    try {
      const updated = await markMessageAsRead(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...updated, sendStatus: "sent" as const } : m)),
      );
    } catch {
      // silencioso
    }
  }, []);

  // ── WebSocket ──
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribe(conversationId);

    const handler = (data: { type: string; message?: Message; conversationId?: string }) => {
      if (data.type === "new_message" && data.conversationId === conversationId && data.message) {
        setMessages((prev) => {
          // Reemplazar temp si coincide por body, o evitar duplicados por id
          const existingTemp = prev.find(
            (m) => m.sendStatus === "sending" && m.body === data.message!.body,
          );
          if (existingTemp) {
            return prev.map((m) =>
              m.id === existingTemp.id ? { ...data.message!, sendStatus: "sent" as const } : m,
            );
          }
          if (prev.some((m) => m.id === data.message!.id)) return prev;
          return [...prev, { ...data.message!, sendStatus: "sent" as const }];
        });
        setHasMore(false);
      }
    };

    const removeHandler = onMessage(handler);
    return () => { unsubscribe(); removeHandler(); };
  }, [conversationId, subscribe, onMessage]);

  // Si el WebSocket se cierra, vuelve a consultar la conversación para no
  // dejar la vista desactualizada mientras el provider intenta reconectar.
  const previousSocketStatus = useRef(socketStatus);
  useEffect(() => {
    const wasConnected = previousSocketStatus.current === "open";
    previousSocketStatus.current = socketStatus;

    if (conversationId && wasConnected && socketStatus === "closed") {
      void fetchMessages();
    }
  }, [conversationId, fetchMessages, socketStatus]);

  // ── Efecto al cambiar conversación ──
  useEffect(() => {
    if (conversationId) { fetchMessages(); }
    else { setMessages([]); setIsLoading(false); }
  }, [conversationId, fetchMessages]);

  return { messages, isLoading, error, hasMore, loadMore, refresh, sendOptimistic, markRead };
}

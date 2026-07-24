"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";

export default function ChatPage() {
  const auth = useAuth();
  // Ciudadano anónimo: sin JWT → sus propios mensajes tienen senderUserId === null.
  // Usuario autenticado: sus propios mensajes tienen senderUserId === auth.user.id.
  const isCitizen = !auth.token;
  const myUserId = auth.user?.id ?? null;

  const { conversations, isLoading: conversationsLoading, error: conversationsError } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null,
  );

  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    sendOptimistic,
    markRead,
  } = useMessages(selectedConversationId);

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marcar como leídos los mensajes ajenos no leídos al abrir la conversación
  useEffect(() => {
    const unread = messages.filter((m) => !m.readAt && !isMe(m));
    if (unread.length > 0) markRead(unread[unread.length - 1].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  function isMe(msg: { senderUserId: string | null; sendStatus: string }) {
    // Mensajes temporales (optimistas) siempre son míos
    if (msg.sendStatus !== "sent") return true;
    return isCitizen ? msg.senderUserId === null : msg.senderUserId === myUserId;
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = inputValue.trim();
    if (!body || !selectedConversationId) return;
    setInputValue("");
    sendOptimistic(body);
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // ── Estados de carga ──
  if (conversationsLoading) {
    return (
      <div className="max-w-5xl mx-auto h-[calc(100vh-4rem-5rem)] lg:h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          Cargando conversaciones...
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="max-w-5xl mx-auto h-[calc(100vh-4rem-5rem)] lg:h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-bold text-on-surface">Error al cargar conversaciones</h2>
          <p className="text-sm text-on-surface-variant">{conversationsError}</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="max-w-5xl mx-auto h-[calc(100vh-4rem-5rem)] lg:h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">💬</div>
          <h2 className="text-xl font-bold text-on-surface">Sin conversaciones</h2>
          <p className="text-sm text-on-surface-variant">
            No tienes conversaciones activas. Crea una emergencia o acepta una para comenzar a chatear.
          </p>
        </div>
      </div>
    );
  }

  // ── Vista principal ──
  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-4rem-5rem)] lg:h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-0 overflow-hidden">
      {/* Sidebar — lista de hilos */}
      <aside className="hidden lg:flex flex-col w-80 flex-shrink-0 border-r border-outline-variant bg-surface-container-low">
        <div className="px-4 py-4 border-b border-outline-variant">
          <h1 className="font-bold text-base text-on-surface">Mensajes</h1>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-outline-variant" role="list">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                type="button"
                onClick={() => setSelectedConversationId(conv.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-surface-container transition-colors text-left ${
                  selectedConversationId === conv.id ? "bg-primary-fixed" : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                    <span className="material-symbols-rounded text-on-surface-variant text-xl" aria-hidden="true">
                      {conv.emergencyId ? "emergency" : "help"}
                    </span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-surface-container-low" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm text-on-surface truncate">
                      {conv.emergencyId ? "Emergencia" : "Solicitud de ayuda"}
                    </span>
                    <span className="text-xs text-on-surface-variant flex-shrink-0">
                      {new Date(conv.updatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">
                    {conv.status === "open" ? "Conversación activa" : "Conversación cerrada"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Área de chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex items-center gap-3">
          <Link href="/" className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-rounded text-xl" aria-hidden="true">arrow_back</span>
          </Link>
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-on-surface-variant text-xl" aria-hidden="true">
              {selectedConversation?.emergencyId ? "emergency" : "help"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-on-surface">
              {selectedConversation?.emergencyId ? "Emergencia" : "Solicitud de ayuda"}
            </h2>
            <p className={`text-xs ${selectedConversation?.status === "open" ? "text-primary" : "text-error"}`}>
              {selectedConversation?.status === "open" ? "Conversación activa" : "Conversación cerrada"}
            </p>
          </div>
        </header>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-background">
          {messagesLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-on-surface-variant">Cargando mensajes...</div>
          ) : messagesError ? (
            <div className="text-center text-error">Error al cargar mensajes</div>
          ) : (
            messages.map((msg) => {
              const mine = isMe(msg);
              return (
                <div key={msg.id} className={`flex flex-col max-w-[78%] ${mine ? "ml-auto items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      mine ? "bg-primary text-on-primary rounded-br-sm" : "bg-surface-container text-on-surface rounded-bl-sm"
                    } ${msg.sendStatus === "failed" ? "opacity-70" : ""}`}
                  >
                    {msg.body}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    <span className="text-xs text-on-surface-variant">
                      {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.sendStatus === "sending" && (
                      <span className="text-xs text-on-surface-variant italic">Enviando...</span>
                    )}
                    {msg.sendStatus === "failed" && (
                      <button
                        type="button"
                        onClick={() => sendOptimistic(msg.body)}
                        className="text-xs text-error underline hover:no-underline"
                      >
                        Falló — reintentar
                      </button>
                    )}
                    {msg.sendStatus === "sent" && msg.readAt && mine && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-0.5">
                        <span className="material-symbols-rounded text-xs" aria-hidden="true">done_all</span>
                        Leído
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {selectedConversation?.status === "open" ? (
          <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-low">
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar mensaje"
              >
                <span className="material-symbols-rounded text-xl" aria-hidden="true">send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-low">
            <div className="text-center text-sm text-on-surface-variant">
              🔒 Esta conversación está cerrada. No se pueden enviar nuevos mensajes.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


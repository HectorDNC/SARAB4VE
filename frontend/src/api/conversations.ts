import { API, getAuthHeaders } from "./client";
import type { Conversation, Message } from "@/types";

// ── Conversations ────────────────────────────────────────────────────────────

/**
 * Lista conversaciones del usuario autenticado (JWT).
 */
export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API}/api/conversations`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errors: [`HTTP ${res.status}`] }));
    throw new Error(body.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? [];
}

/**
 * Lista conversaciones del ciudadano anónimo (access token).
 * Pasa emergencyId para optimizar la validación del token en el backend.
 */
export async function listCitizenConversations(accessToken: string, emergencyId?: string): Promise<Conversation[]> {
  const params = new URLSearchParams();
  params.set("t", accessToken);
  if (emergencyId) params.set("emergencyId", emergencyId);

  const res = await fetch(`${API}/api/conversations/mine?${params.toString()}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errors: [`HTTP ${res.status}`] }));
    throw new Error(body.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? [];
}

// ── Messages ─────────────────────────────────────────────────────────────────

export interface ListMessagesOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Lista mensajes de una conversación con paginación por cursor.
 */
export async function listMessages(
  conversationId: string,
  options: ListMessagesOptions = {},
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));

  // Usar JWT si está disponible, sino access token de ciudadano
  const headers = getAuthHeaders();
    console.log("Headers:", headers);
  if (!headers["Authorization"]) {
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("emergencyAccessToken") : null;
    const emergencyId = typeof window !== "undefined" ? localStorage.getItem("emergencyId") : null;
    if (accessToken) {
      headers["X-Citizen-Token"] = accessToken;
      if (emergencyId) params.set("emergencyId", emergencyId);
    }
  }

  const qs = params.toString();
  const url = `${API}/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errors: [`HTTP ${res.status}`] }));
    throw new Error(body.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? [];
}

/**
 * Envía un mensaje a una conversación.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<Message> {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();

  // Si no hay JWT, usar access token de ciudadano
  if (!headers["Authorization"]) {
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("emergencyAccessToken") : null;
    const emergencyId = typeof window !== "undefined" ? localStorage.getItem("emergencyId") : null;
    if (accessToken) {
      headers["X-Citizen-Token"] = accessToken;
      if (emergencyId) params.set("emergencyId", emergencyId);
    }
  }

  const qs = params.toString();
  const url = `${API}/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({ errors: [`HTTP ${res.status}`] }));
    throw new Error(responseBody.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data;
}

/**
 * Marca un mensaje como leído.
 */
export async function markMessageAsRead(messageId: string): Promise<Message> {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();

  // Si no hay JWT, usar access token de ciudadano
  if (!headers["Authorization"]) {
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("emergencyAccessToken") : null;
    const emergencyId = typeof window !== "undefined" ? localStorage.getItem("emergencyId") : null;
    if (accessToken) {
      headers["X-Citizen-Token"] = accessToken;
      if (emergencyId) params.set("emergencyId", emergencyId);
    }
  }

  const qs = params.toString();
  const url = `${API}/api/messages/${messageId}/read${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errors: [`HTTP ${res.status}`] }));
    throw new Error(body.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data;
}

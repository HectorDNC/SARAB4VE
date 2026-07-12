import { API, getAuthHeaders } from "./client";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type HelpRequestPayload = {
  requesterName: string;
  contactMethod: string;
  contactValue: string;
  needType: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  urgency?: string;
};

export interface HelpRequestListItem {
  id: string;
  requesterName: string;
  contactMethod: string;
  contactValue: string;
  needType: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "low" | "medium" | "high" | "critical";
  status: string;
  volunteerName?: string;
  volunteerContactMethod?: string | null;
  volunteerContactValue?: string | null;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  distanceKm?: number;
}

interface ListHelpRequestsParams {
  status?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

// ── GET — listar ────────────────────────────────────────────────────────────

export async function listHelpRequests(
  params: ListHelpRequestsParams = {},
): Promise<HelpRequestListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set("status", params.status);
  if (params.latitude !== undefined) searchParams.set("latitude", String(params.latitude));
  if (params.longitude !== undefined) searchParams.set("longitude", String(params.longitude));
  if (params.radiusKm !== undefined) searchParams.set("radiusKm", String(params.radiusKm));

  const qs = searchParams.toString();
  const url = `${API}/api/help-requests${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? [];
}

// ── POST — crear ────────────────────────────────────────────────────────────

export async function sendHelpRequest(payload: HelpRequestPayload) {
  const res = await fetch(`${API}/api/help-requests`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  // Return parsed JSON when available, otherwise null
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ── GET — por ID (detalle completo) ──────────────────────────────────────

export interface HelpRequestDetail {
  id: string;
  requesterName: string;
  contactMethod: string;
  contactValue: string;
  needType: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "low" | "medium" | "high" | "critical";
  status: string;
  volunteerName: string | null;
  volunteerContactMethod: string | null;
  volunteerContactValue: string | null;
  assignedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export async function getHelpRequestById(id: string): Promise<HelpRequestDetail> {
  const res = await fetch(`${API}/api/help-requests/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

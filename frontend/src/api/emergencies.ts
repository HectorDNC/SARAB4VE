import { API, getAuthHeaders } from "./client";

export type EmergencyPayload = {
  requesterName?: string;
  isInjured?: boolean;
  cannotMove?: boolean;
  disabilityType: string;
  communicationMode?: string | null;
  disabilitySubcategory?: string | null;
  extraInfo?: string;
  voiceNoteUrl?: string | null;
  voiceNoteDurationSec?: number | null;
  latitude: number;
  longitude: number;
  urgency?: string;
  needType: string;
  description: string;
};

export interface EmergencyListItem {
  id: string;
  latitude: number;
  longitude: number;
  urgency: "low" | "medium" | "high" | "critical";
  needType: string;
  disabilityType: string;
  status: string;
  createdAt: string;
  distanceKm?: number;
  requesterName?: string;
  isInjured?: boolean;
  cannotMove?: boolean;
  description?: string;
  extraInfo?: string;
  disabilitySubcategory?: string | null;
  communicationMode?: string | null;
  voiceNoteUrl?: string | null;
  voiceNoteDurationSec?: number | null;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  updatedAt?: string | null;
}

interface ListEmergenciesParams {
  status?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export async function sendEmergency(payload: EmergencyPayload) {
  const res = await fetch(`${API}/api/emergencies`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function listEmergencies(
  params: ListEmergenciesParams = {},
): Promise<EmergencyListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set("status", params.status);
  if (params.latitude !== undefined) searchParams.set("latitude", String(params.latitude));
  if (params.longitude !== undefined) searchParams.set("longitude", String(params.longitude));
  if (params.radiusKm !== undefined) searchParams.set("radiusKm", String(params.radiusKm));

  const qs = searchParams.toString();
  const url = `${API}/api/emergencies${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? [];
}

// ── GET — por ID (detalle completo) ──────────────────────────────────────

export interface EmergencyDetail {
  id: string;
  requesterName: string | null;
  isInjured: boolean;
  cannotMove: boolean;
  disabilityType: string;
  communicationMode: string | null;
  disabilitySubcategory: string | null;
  extraInfo: string | null;
  voiceNoteUrl: string | null;
  voiceNoteDurationSec: number | null;
  latitude: number;
  longitude: number;
  urgency: "low" | "medium" | "high" | "critical";
  needType: string;
  description: string;
  status: string;
  assignedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getEmergencyById(id: string): Promise<EmergencyDetail> {
  const res = await fetch(`${API}/api/emergencies/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

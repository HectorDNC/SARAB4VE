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
  need_type: string;
  disability_type: string;
  status: string;
  created_at: string;
  distanceKm?: number;
  requester_name?: string;
  is_injured?: boolean;
  cannot_move?: boolean;
  description?: string;
  extra_info?: string;
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

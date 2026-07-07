const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  requester_name: string;
  contact_method: string;
  contact_value: string;
  need_type: string;
  description: string;
  latitude: number;
  longitude: number;
  urgency: "low" | "medium" | "high" | "critical";
  status: string;
  volunteer_name?: string;
  assigned_at?: string;
  resolved_at?: string;
  created_at: string;
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

  const res = await fetch(url);
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
    headers: { "Content-Type": "application/json" },
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

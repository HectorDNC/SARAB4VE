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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function sendEmergency(payload: EmergencyPayload) {
  const res = await fetch(`${API}/api/emergencies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

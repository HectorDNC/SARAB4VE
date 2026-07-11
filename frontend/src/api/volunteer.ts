import { API, getAuthHeaders } from "./client";

export type VolunteerPayload = {
  fullName?: string;
  email?: string;
  phone?: string | null;
  password: string;
  location?: { lat: number; lng: number } | null;
  zone?: string | null;
  skills?: string[] | null;
  availableHours?: number | null;
  availableDays?: string[] | null;
  acceptedTerms: boolean;
};

export async function sendVolunteer(payload: VolunteerPayload) {
  const res = await fetch(`${API}/api/auth/register/volunteer`, {
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

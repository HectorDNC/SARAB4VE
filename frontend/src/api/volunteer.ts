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

  // Nuevos campos
  documentNumber: string;
  birthDate: string;
  address: string;
  volunteerType: string;
  profession?: string;
  languages?: string[];
  experienceCategories?: string[];
  scheduleHours: number[];
  modalityPresential: boolean;
  modalityOnline: boolean;
  interestAreas: string[];
  hasPriorExperience?: boolean | null;
};

export async function sendVolunteer(payload: VolunteerPayload) {
  const res = await fetch(`${API}/api/auth/register/volunteer`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;

    if (res.status === 400) throw new Error("Error en la validación.");
    if (res.status === 409) throw new Error("El correo electrónico o el teléfono ya se encuentran registrados.");
    throw new Error(message);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

import { API, getAuthHeaders } from "./client";

export type OrganizationPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  location: { lat: number; lng: number } | null;
  zone: string;
  organizationName: string;
  legalDocument: string;
  workArea: string[];
  acceptedTerms: boolean;
};

// Rama feat/verificaciones-users-back (aún no mergeada a main, pero ya
// desplegada): este endpoint ahora devuelve { token, user } en vez de solo
// el user, para permitir llamar de inmediato a /api/organizations/register
// sin pasar por login. Ver frontend/src/api/verification.ts.
export type OrganizationRegisterResponse = {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    [key: string]: unknown;
  };
};

export async function sendOrganization(payload: OrganizationPayload): Promise<OrganizationRegisterResponse | null> {
  const res = await fetch(`${API}/api/auth/register/organization`, {
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
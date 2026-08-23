import { API, getAuthHeaders } from "./client";
import type { OrganizationRegisterPayload } from "./verification";

// El payload de registro usa el formato extendido del backend
export type OrganizationPayload = OrganizationRegisterPayload;

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
  // Campos extendidos del perfil (pueden estar presentes)
  profile?: {
    userId: string;
    organizationTypeId: number | null;
    taxId: string | null;
    registryNumber: string | null;
    foundedAt: string | null;
    country: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    website: string | null;
    socialLinks: Record<string, string> | null;
    mission: string | null;
    vision: string | null;
    scope: string | null;
    servedGroups: string | null;
  };
  legalRepresentatives?: Array<{
    fullName: string;
    position?: string | null;
    phone?: string | null;
    email?: string | null;
  }>;
  verification?: {
    id: number;
    ownerId: string;
    entityType: string;
    status: string;
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
    const body = await res.json();
    // El backend devuelve { data: { token, user, profile?, legalRepresentatives?, verification? } }
    return body.data ?? body;
  } catch {
    return null;
  }
}
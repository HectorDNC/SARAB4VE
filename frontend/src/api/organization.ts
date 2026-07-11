const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export async function sendOrganization(payload: OrganizationPayload) {
  const res = await fetch(`${API}/api/auth/register/organization`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error ?? body?.errors?.join(", ") ?? `HTTP ${res.status}`;
    throw new Error(message);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}
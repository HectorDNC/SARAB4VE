import { normalizeUser } from "@/lib/normalizeUser";
import { API, getAuthHeaders } from "./client";
import { ApiUser, ROLES_USER } from "@/types";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: ROLES_USER;
  status: string;
  location: { lat: number; lng: number } | null;
  zone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  data: {
    token: string;
    user: LoginUser;
  };
};

export async function login(payload: LoginPayload): Promise<{ token: string; user: ApiUser }> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const rawMessage = body?.errors?.join(", ") ?? body?.error ?? `HTTP ${res.status}`;

    if (res.status === 401) {
      throw new Error("Correo o contraseña incorrectos.");
    }
    if (res.status === 403) {
      throw new Error("Tu cuenta aún no está aprobada o fue suspendida. Contacta al equipo de SARA.");
    }
    throw new Error(rawMessage);
  }

  const rawData = await res.json();

  return {
    token: rawData.data.token,
    user: normalizeUser(rawData.data.user),
  };
}
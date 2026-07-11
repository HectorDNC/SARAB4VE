const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  location: { lat: number; lng: number } | null;
  zone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  data: {
    token: string;
    user: LoginUser;
  };
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  return res.json();
}
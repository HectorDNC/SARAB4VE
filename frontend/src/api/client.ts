const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ayudasara.org";

/**
 * Retorna los headers base para peticiones HTTP.
 * Incluye el token JWT si existe en localStorage.
 */
export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

export { API };

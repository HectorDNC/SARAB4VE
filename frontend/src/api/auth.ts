import { API, getAuthHeaders } from "./client";

export type ValidateCompletionTokenResponse = {
  valid: boolean;
  status?: string;
};

export async function validateCompletionToken(
  token: string
): Promise<ValidateCompletionTokenResponse> {
  const res = await fetch(
    `${API}/api/auth/validate-completion-token?token=${encodeURIComponent(token)}`,
    { headers: getAuthHeaders() }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const body = await res.json();
  return body.data;
}

export type CompleteRegistrationPayload = {
  token: string;
  password: string;
};

export type CompleteRegistrationResponse = {
  completed: boolean;
};

export async function completeRegistration(
  payload: CompleteRegistrationPayload
): Promise<CompleteRegistrationResponse> {
  const res = await fetch(`${API}/api/auth/complete-registration`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.errors?.join(", ") ?? `HTTP ${res.status}`);
  }

  const body = await res.json();
  return body.data;
}

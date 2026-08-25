/**
 * Cliente API para el módulo de verificación (backend `feat/verificaciones-users-back`,
 * aún NO mergeado a main pero ya desplegado en https://sarab4ve-back.vercel.app).
 *
 * Flujo completo (requiere JWT — usar después de `sendOrganization` en organization.ts,
 * que ahora devuelve { token, user }):
 *   1. POST /api/auth/register/organization  → { token, user }  (organization.ts)
 *   2. GET  /api/catalog?type=...            → poblar picklists dinámicos
 *   3. POST /api/organizations/register      → crea perfil extendido + solicitud de verificación
 *   4. POST /api/verification-documents      → por cada archivo (URL de subida aún es un
 *      placeholder en el backend: no confirma que el archivo llegó al bucket real)
 *   5. GET  /api/verification-documents/:ownerId → checklist de documentos requeridos
 *   6. GET  /api/verification/status         → estado de la solicitud
 *
 * NOTA: este archivo NO está conectado todavía al formulario de registro de
 * organización (`page.tsx`). Se deja listo para conectar cuando el backend
 * resuelva los huecos conocidos (ver comentarios TODO en mapper.ts).
 */
import { API, getAuthHeaders } from "./client";

// ---------------------------------------------------------------------------
// Tipos — contrato exacto de verification.schema.js (backend)
// ---------------------------------------------------------------------------

export type CatalogType =
  | "organization_type"
  | "disability_type"
  | "service"
  | "interest_area"
  | "experience_category";

export type CatalogItem = {
  id: number;
  type: string;
  name: string;
};

export type LegalRepresentativeInput = {
  fullName: string;
  position?: string;
  phone?: string;
  email?: string;
};

export type OrganizationRegisterPayload = {
  // Campos básicos requeridos por el backend (CommonFields + organización)
  fullName: string;
  email: string;
  phone: string;
  password: string;
  organizationName: string;
  legalDocument: string;
  acceptedTerms: true;
  
  // Campos extendidos del perfil de organización
  organizationTypeId: number;
  taxId?: string;
  registryNumber?: string;
  foundedAt?: string; // YYYY-MM-DD
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  mission?: string;
  vision?: string;
  scope?: string;
  servedGroups?: string;
  legalRepresentatives?: LegalRepresentativeInput[];
  disabilityTypeIds?: number[];
  serviceIds?: number[];
};

export type VerificationRequest = {
  id: number;
  ownerId: string;
  entityType: string;
  status: "entregada" | "en_estudio" | "rechazada" | "aceptada";
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type VerificationDocument = {
  id: number;
  ownerId: string;
  documentTypeId: number;
  fileUrl: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  uploadedAt: string;
};

export type DocumentTypeInfo = {
  id: number;
  code: string;
  name: string;
  entityType: string;
  isRequired: boolean;
};

export type DocumentChecklistItem = {
  documentType: DocumentTypeInfo;
  submission: VerificationDocument | null;
  isComplete: boolean;
};

export type DocumentUploadPayload = {
  documentTypeId: number;
  fileName: string;
  mimeType: string;
};

export type DocumentUploadResponse = VerificationDocument & {
  uploadUrl: string;
  storageKey: string;
};

// ---------------------------------------------------------------------------
// Helper — manejo de errores uniforme
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  const body = await res.json();
  return body.data as T;
}

/**
 * Resuelve el header Authorization: usa `token` si se pasa explícitamente
 * (caso de un registro recién creado, todavía sin sesión en localStorage),
 * o cae a `getAuthHeaders()` para el caso de un usuario ya logueado.
 */
function resolveAuthHeader(token?: string): Record<string, string> {
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  const authHeaders = getAuthHeaders();
  return authHeaders["Authorization"] ? { Authorization: authHeaders["Authorization"] } : {};
}

// ---------------------------------------------------------------------------
// GET /api/catalog?type=...
// ---------------------------------------------------------------------------

export async function getCatalog(type: CatalogType): Promise<CatalogItem[]> {
  const res = await fetch(`${API}/api/catalog?type=${type}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return handleResponse<CatalogItem[]>(res);
}

// ---------------------------------------------------------------------------
// POST /api/organizations/register
// ---------------------------------------------------------------------------

export async function registerOrganizationProfile(
  payload: OrganizationRegisterPayload
): Promise<{ profile: unknown; verification: VerificationRequest }> {
  const res = await fetch(`${API}/api/organizations/register`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<{ profile: unknown; verification: VerificationRequest }>(res);
}

// ---------------------------------------------------------------------------
// GET /api/verification/status
// ---------------------------------------------------------------------------

export async function getMyVerificationStatus(): Promise<VerificationRequest> {
  const res = await fetch(`${API}/api/verification/status`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return handleResponse<VerificationRequest>(res);
}

// ---------------------------------------------------------------------------
// POST /api/verification-documents
// ---------------------------------------------------------------------------

export async function requestDocumentUpload(
  payload: DocumentUploadPayload
): Promise<DocumentUploadResponse> {
  const res = await fetch(`${API}/api/verification-documents`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<DocumentUploadResponse>(res);
}

/**
 * Sube un documento de verificación usando multipart/form-data.
 * El backend espera el archivo en el campo "file" y documentTypeId como campo de texto.
 */
export async function uploadVerificationDocument(
  file: File,
  documentTypeId: number,
  token?: string
): Promise<VerificationDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentTypeId", String(documentTypeId));

  const res = await fetch(`${API}/api/verification-documents`, {
    method: "POST",
    headers: resolveAuthHeader(token),
    body: formData,
  });

  return handleResponse<VerificationDocument>(res);
}

// ---------------------------------------------------------------------------
// GET /api/verification-documents/:ownerId
// ---------------------------------------------------------------------------

export async function getDocumentChecklist(ownerId: string, token?: string): Promise<DocumentChecklistItem[]> {
  const res = await fetch(`${API}/api/verification-documents/${ownerId}`, {
    method: "GET",
    headers: resolveAuthHeader(token),
  });
  return handleResponse<DocumentChecklistItem[]>(res);
}

// ---------------------------------------------------------------------------
// GET /api/verification-documents/:id/download — URL prefirmada temporal
// ---------------------------------------------------------------------------

export type DownloadUrlResponse = {
  downloadUrl: string;
  expiresIn: number;
};

export async function getDocumentDownloadUrl(documentId: number): Promise<DownloadUrlResponse> {
  const res = await fetch(`${API}/api/verification-documents/${documentId}/download`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return handleResponse<DownloadUrlResponse>(res);
}

// ---------------------------------------------------------------------------
// PATCH /api/verification-documents/:id/review — admin aprueba/rechaza
// ---------------------------------------------------------------------------

export type DocumentReviewPayload = {
  status: "approved" | "rejected";
  reason?: string;
};

export async function reviewVerificationDocument(
  documentId: number,
  payload: DocumentReviewPayload,
): Promise<VerificationDocument> {
  const res = await fetch(`${API}/api/verification-documents/${documentId}/review`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<VerificationDocument>(res);
}

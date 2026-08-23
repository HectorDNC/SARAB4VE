import { normalizeUser } from "@/lib/normalizeUser";
import { ApiUser, ListUsersParams, ListUsersResponse, OrganizationProfileResponse } from "@/types";
import { API, getAuthHeaders } from "./client";

export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
    const searchParams = new URLSearchParams();

    if (params.role) searchParams.set("role", params.role);
    if (params.status) searchParams.set("status", params.status);
    if (params.search) searchParams.set("search", params.search);
    searchParams.set("limit", String(params.limit ?? 50));
    searchParams.set("offset", String(params.offset ?? 0));

    const res = await fetch(`${API}/api/users?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;

        if (res.status === 401) throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        if (res.status === 403) throw new Error("No tienes permisos de administrador para ver esta sección.");
        throw new Error(message);
    }

    const rawData = await res.json();

    return {
        data: {
            users: rawData.data.users.map(normalizeUser),
            total: rawData.data.total,
            limit: rawData.data.limit,
            offset: rawData.data.offset,
        },
    };
}

export async function getUserById(id: string): Promise<ApiUser> {

    const res = await fetch(`${API}/api/users/${id}`, {
        headers: getAuthHeaders(),
    });
    console.log(res)

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;

        if (res.status === 401) throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        if (res.status === 403) throw new Error("No tienes permisos para ver este usuario.");
        if (res.status === 404) throw new Error("Usuario no encontrado.");
        throw new Error(message);
    }

    try {
        const rawData = await res.json();
        return normalizeUser(rawData.data);
    } catch (error) {
        throw new Error(`Error al procesar los datos del usuario del servidor. ${error}`);
    }
}

export async function approveUser(id: string): Promise<ApiUser> {
    const res = await fetch(`${API}/api/users/${id}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;

        if (res.status === 401) throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        if (res.status === 403) throw new Error("No tienes permisos para ver este usuario.");
        if (res.status === 404) throw new Error("Usuario no encontrado.");
        if (res.status === 409) throw new Error("Usuario no se encuentra con el estado Pendiente.");
        throw new Error(message);
    }

    try {
        const rawData = await res.json();
        return normalizeUser(rawData.data);
    } catch(error) {
        throw new Error(`Error al procesar los datos del usuario del servidor. ${error}`);
    }
}

export async function rejectUser(id: string): Promise<ApiUser> {
    const res = await fetch(`${API}/api/users/${id}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;

        if (res.status === 401) throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        if (res.status === 403) throw new Error("No tienes permisos para ver este usuario.");
        if (res.status === 404) throw new Error("Usuario no encontrado.");
        if (res.status === 409) throw new Error("Usuario no se encuentra con el estado Pendiente.");
        throw new Error(message);
    }

    try {
        const rawData = await res.json();
        return normalizeUser(rawData.data);
    } catch {
        throw new Error("Error al procesar los datos del usuario del servidor.");
    }


}

export async function getOrganizationProfile(id: string): Promise<OrganizationProfileResponse> {
    const res = await fetch(`${API}/api/users/${id}/organization-profile`, {
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.errors?.join(", ") ?? `HTTP ${res.status}`;

        if (res.status === 401) throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        if (res.status === 403) throw new Error("No tienes permisos para ver este perfil.");
        if (res.status === 404) throw new Error("Usuario no encontrado.");
        throw new Error(message);
    }

    try {
        const rawData = await res.json();
        const data = rawData.data;

        return {
            user: normalizeUser(data.user),
            organizationProfile: data.organizationProfile ?? null,
            legalRepresentatives: data.legalRepresentatives ?? [],
            disabilityTypes: data.disabilityTypes ?? [],
            services: data.services ?? [],
            verification: data.verification ?? null,
            documents: data.documents ?? [],
        };
    } catch (error) {
        throw new Error(`Error al procesar el perfil de la organización. ${error}`);
    }
}
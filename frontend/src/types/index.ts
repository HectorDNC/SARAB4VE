export type AccessibilityTag = "rampas" | "banio" | "lengua_senas" | "animales";
export type ServiceTag = "wifi" | "salud" | "comida";

// ── Tipos del mapa (unificado) ──────────────────────────────────────────────

export type MapItemKind = "emergency" | "help_request" | "shelter";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type EmergencyStatus = "received" | "assigned" | "resolved";
export type HelpRequestStatus = "open" | "assigned" | "resolved";
export type DisabilityType = "visual" | "auditiva" | "neuro" | "motriz";

/** Interfaz común para cualquier elemento pintable en el mapa. */
export interface MapItem {
    kind: MapItemKind;
    id: string;
    lat: number;
    lng: number;
    urgency: UrgencyLevel;
    status: string;
    createdAt: string;
    // Emergencia
    requesterName?: string;
    disabilityType?: DisabilityType;
    disabilitySubcategory?: string;
    communicationMode?: string | null;
    needType?: string;
    description?: string;
    isInjured?: boolean;
    cannotMove?: boolean;
    extraInfo?: string;
    voiceNoteUrl?: string | null;
    voiceNoteDurationSec?: number | null;
    // Help Request
    contactMethod?: string;
    contactValue?: string;
    volunteerName?: string;
    volunteerContactMethod?: string | null;
    volunteerContactValue?: string | null;
    // Timestamps
    assignedAt?: string | null;
    resolvedAt?: string | null;
    updatedAt?: string | null;
    // Refugio (heredado)
    name?: string;
    address?: string;
    sector?: string;
    tags?: AccessibilityTag[];
    services?: ServiceTag[];
    distance?: string;
    distanceKm?: number;
    imagen?: string;
}

// ── LeafletMap ──────────────────────────────────────────────────────────────

export interface LeafletMapProps {
    shelters: iRefugio[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    mapItems?: MapItem[];
}

// ── Refugio ────────────────────────────────────────────────────────────────

export interface iRefugio {
    id: string;
    name: string;
    address: string;
    sector: string;
    status: "activo" | "lleno" | "cerrado";
    tags: AccessibilityTag[];
    services: ServiceTag[];
    lat: number;
    lng: number;
    distance: string;
    imagen?: string;
}

// -------- Base Person Register ---------------------

interface BaseUserForm {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    location: { lat: number; lng: number } | null;
    zone: string;
}

// ----------- Volunteer ------------------------

export const SKILLS = [
    { value: 'primeros_auxilios', label: 'Primeros Auxilios' },
    { value: 'logistica', label: 'Logística' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'psicología', label: 'Psicología' },
    { value: 'idiomas', label: 'Idiomas' },
    { value: 'rescate', label: 'Rescate' },
    { value: 'comunicaciones', label: 'Comunicaciones' }
];

export const DAYS_WEEKEND = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miércoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sábado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' }
]

export interface iVolunteerForm extends BaseUserForm {
    skills: string[];
    availableHours: number;
    availableDays: string[];
    acceptedTerms: boolean;

}

export interface iInfoVolunteer extends Omit<iVolunteerForm, "password"> {
    id: string;
    status: STATUS_USERS;
}


// ---------- Organitations ---------------------


export interface iOrganizationForm extends BaseUserForm {
    organizationName: string;
    legalDocument: string;
    workArea: string[];
    acceptedTerms: boolean;
}

export const WORK_AREAS = [
    { value: "alimentacion", label: "Alimentación" },
    { value: "salud", label: "Salud" },
    { value: "refugio", label: "Refugio" },
    { value: "logistica", label: "Logística" },
    { value: "rescate", label: "Rescate" },
    { value: "psicosocial", label: "Apoyo psicosocial" },
];

export interface iInfoOrganization extends Omit<iOrganizationForm, "password"> {
    id: string;
    status: STATUS_USERS;
}

// -------- Login Usuario -----------------

export interface UserLogin {
    email: string;
    password: string;
}

export type ROLES_USER = 'admin' | 'organization' | 'volunteer' | 'citizen';


// ----------- Panel Usuarios ---------------

export type STATUS_USERS = 'pending' | 'approved' | 'rejected' | 'suspended';


export interface ApiUser {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: ROLES_USER;
    status: STATUS_USERS;
    location: { lat: number; lng: number } | null;
    zone: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ListUsersResponse {
    data: {
        users: ApiUser[];
        total: number;
        limit: number;
        offset: number;
    };
}

export interface ListUsersParams {
    role?: ROLES_USER;
    status?: STATUS_USERS;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface IdParam {
    id: string;
}



// -------- Perfil administrador - Registro ----------------------

export interface iAdmin extends BaseUserForm {
    adminSecret: string;
}

export const USE_MOCK=false;
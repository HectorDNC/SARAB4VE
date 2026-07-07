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
  needType?: string;
  description?: string;
  isInjured?: boolean;
  cannotMove?: boolean;
  extraInfo?: string;
  // Help Request
  contactMethod?: string;
  contactValue?: string;
  volunteerName?: string;
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

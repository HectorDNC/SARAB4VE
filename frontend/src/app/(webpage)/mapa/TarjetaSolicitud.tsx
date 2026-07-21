"use client";

import { MapItem, UrgencyLevel } from "@/types";

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-orange-100 text-orange-800",
};

const NEED_TYPE_LABELS: Record<string, string> = {
  equipment: "Equipamiento",
  medication: "Medicación",
  transport: "Transporte",
  companionship: "Acompañamiento",
  interpreter: "Intérprete",
  accessible_information: "Información accesible",
  neurodivergent_support: "Apoyo neurodivergente",
  psychosocial_support: "Apoyo psicosocial",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  assigned: "Asignada",
  resolved: "Resuelta",
};

interface Props {
  item: MapItem;
  isSelected: boolean;
  onClick: () => void;
}

export function TarjetaSolicitud({ item, isSelected, onClick }: Props) {
  const urgency = item.urgency as UrgencyLevel;
  const statusLabel = STATUS_LABELS[item.status] ?? item.status;
  const needLabel = NEED_TYPE_LABELS[item.needType ?? ""] ?? item.needType;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border transition-all duration-150 focus-visible:outline-3 focus-visible:outline-primary p-4 ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:shadow-sm"
      }`}
      aria-pressed={isSelected}
      aria-label={`Solicitud de ${needLabel}, urgencia ${URGENCY_LABELS[urgency]}`}
    >
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isSelected ? "bg-[#0040a1]" : "bg-blue-50"
          }`}
        >
          <span
            className={`material-symbols-rounded text-xl ${isSelected ? "text-white" : "text-[#0040a1]"}`}
            aria-hidden="true"
          >
            handshake
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-on-surface truncate">
              {item.requesterName ?? "Solicitante anónimo"}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${URGENCY_COLORS[urgency]}`}>
              {URGENCY_LABELS[urgency]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {needLabel && (
              <span className="text-[11px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                {needLabel}
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{item.description}</p>
          )}
        </div>

        {/* Badge de estado */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            item.status === "open"
              ? "bg-blue-100 text-blue-700"
              : item.status === "assigned"
                ? "bg-purple-100 text-purple-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Info extra */}
      <div className="mt-2 flex flex-wrap gap-1">
        {item.volunteerName && (
          <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <span className="material-symbols-rounded text-[12px]">volunteer_activism</span>
            {item.volunteerName}
          </span>
        )}
        {item.distanceKm !== undefined && (
          <span className="text-[10px] font-semibold text-primary ml-auto">
            {item.distanceKm < 1
              ? `${Math.round(item.distanceKm * 1000)} m`
              : `${item.distanceKm.toFixed(1)} km`}
          </span>
        )}
      </div>
    </button>
  );
}

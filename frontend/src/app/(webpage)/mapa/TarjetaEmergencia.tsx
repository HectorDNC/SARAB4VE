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
  critical: "bg-red-100 text-red-800",
};

const DISABILITY_LABELS: Record<string, string> = {
  visual: "Visual",
  auditiva: "Auditiva",
  neuro: "Neurodivergente",
  motriz: "Motriz",
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
  received: "Recibida",
  assigned: "Asignada",
  resolved: "Resuelta",
};

interface Props {
  item: MapItem;
  isSelected: boolean;
  onClick: () => void;
}

export function TarjetaEmergencia({ item, isSelected, onClick }: Props) {
  const urgency = item.urgency as UrgencyLevel;
  const statusLabel = STATUS_LABELS[item.status] ?? item.status;
  const needLabel = NEED_TYPE_LABELS[item.needType ?? ""] ?? item.needType;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border transition-all duration-150 focus-visible:outline-3 focus-visible:outline-primary p-4 ${
        isSelected
          ? "border-red-500 bg-red-50/60 shadow-md"
          : "border-outline-variant bg-surface-container-lowest hover:border-red-300 hover:shadow-sm"
      }`}
      aria-pressed={isSelected}
      aria-label={`Emergencia ${item.requesterName ?? "anónima"}, urgencia ${URGENCY_LABELS[urgency]}`}
    >
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isSelected ? "bg-red-600" : "bg-red-100"
          }`}
        >
          <span
            className={`material-symbols-rounded text-xl ${isSelected ? "text-white" : "text-red-600"}`}
            aria-hidden="true"
          >
            emergency
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-on-surface truncate">
              {item.requesterName ?? "Persona en emergencia"}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${URGENCY_COLORS[urgency]}`}>
              {URGENCY_LABELS[urgency]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {item.disabilityType && (
              <span className="text-[11px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                {DISABILITY_LABELS[item.disabilityType] ?? item.disabilityType}
              </span>
            )}
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
            item.status === "received"
              ? "bg-red-100 text-red-700"
              : item.status === "assigned"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Tags extra */}
      <div className="mt-2 flex flex-wrap gap-1">
        {item.isInjured && (
          <span className="flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <span className="material-symbols-rounded text-[12px]">personal_injury</span>
            Herido
          </span>
        )}
        {item.cannotMove && (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <span className="material-symbols-rounded text-[12px]">wheelchair_pickup</span>
            No puede moverse
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

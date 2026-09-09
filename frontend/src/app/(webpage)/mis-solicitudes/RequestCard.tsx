"use client";

import type { HelpRequestListItem } from "@/api/helpRequests";

// Mismas etiquetas y colores que TarjetaSolicitud (frontend/src/app/(webpage)/mapa/),
// que es la única vista existente donde admin/organización/voluntario ven
// solicitudes hoy — se replica el mismo estilo visual aquí, sin la lógica
// de selección/sincronización con el mapa que esa tarjeta sí necesita.

const URGENCY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const URGENCY_COLORS: Record<string, string> = {
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

export function RequestCard({ item }: { item: HelpRequestListItem }) {
  const urgencyLabel = URGENCY_LABELS[item.urgency] ?? item.urgency;
  const urgencyColor = URGENCY_COLORS[item.urgency] ?? "bg-surface-container text-on-surface-variant";
  const statusLabel = STATUS_LABELS[item.status] ?? item.status;
  const needLabel = NEED_TYPE_LABELS[item.needType] ?? item.needType;

  return (
    <div className="w-full text-left rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
          <span className="material-symbols-rounded text-xl text-[#0040a1]" aria-hidden="true">
            handshake
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-on-surface truncate">
              {needLabel ?? "Solicitud de apoyo"}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyColor}`}>
              {urgencyLabel}
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant mt-1">
            Enviada el{" "}
            {new Date(item.createdAt).toLocaleDateString("es", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>

          {item.description && (
            <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{item.description}</p>
          )}
        </div>

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

      {item.volunteerName && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <span className="material-symbols-rounded text-[12px]">volunteer_activism</span>
            {item.volunteerName}
          </span>
        </div>
      )}
    </div>
  );
}

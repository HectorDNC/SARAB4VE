"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHelpRequestStats } from "@/api/helpRequests";
import { getEmergencyStats } from "@/api/emergencies";

// Contadores de solicitudes activas (EP-03). Cada contador enlaza al mapa con
// el filtro de tipo preseleccionado. "Activas" usa la misma definición que el
// filtro "active" del mapa: help-requests "open" y emergencias "received".
//
// Estados de cada contador (independientes entre sí):
//   undefined → cargando
//   null      → sin datos reales (error / backend no disponible) → en blanco
//   number    → dato real del backend (0 incluido)

type CounterValue = number | null | undefined;

function CounterCard({
  href,
  icon,
  title,
  value,
  tone,
}: {
  href: string;
  icon: string;
  title: string;
  value: CounterValue;
  tone: "primary" | "error";
}) {
  const iconColor = tone === "error" ? "text-error" : "text-primary";

  return (
    <Link
      href={href}
      className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 hover:bg-surface-container transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className={`material-symbols-rounded text-3xl ${iconColor}`} aria-hidden="true">
          {icon}
        </span>
        <span className="material-symbols-rounded text-on-surface-variant" aria-hidden="true">
          arrow_forward
        </span>
      </div>

      {value === undefined ? (
        <p className="mt-3 h-9 w-16 rounded-lg bg-surface-container animate-pulse" aria-label="Cargando" />
      ) : value === null ? (
        <p className="text-3xl font-bold text-on-surface-variant mt-3" aria-label="Sin datos">
          —
        </p>
      ) : (
        <p className="text-3xl font-bold text-on-surface mt-3">{value}</p>
      )}
      <p className="text-sm text-on-surface-variant">{title}</p>
      <p className="mt-2 text-xs font-semibold text-primary">Ver en el mapa</p>
    </Link>
  );
}

export default function RequestCounters() {
  const [helpRequests, setHelpRequests] = useState<CounterValue>(undefined);
  const [emergencies, setEmergencies] = useState<CounterValue>(undefined);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([getHelpRequestStats(), getEmergencyStats()]).then(
      ([helpResult, emergencyResult]) => {
        if (cancelled) return;
        setHelpRequests(helpResult.status === "fulfilled" ? helpResult.value.open : null);
        setEmergencies(emergencyResult.status === "fulfilled" ? emergencyResult.value.received : null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <CounterCard
        href="/mapa?tipo=help_request"
        icon="handshake"
        title="Solicitudes de apoyo activas"
        value={helpRequests}
        tone="primary"
      />
      <CounterCard
        href="/mapa?tipo=emergency"
        icon="emergency"
        title="Emergencias activas"
        value={emergencies}
        tone="error"
      />
    </div>
  );
}

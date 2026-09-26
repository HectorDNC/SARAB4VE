"use client";

import RequestCounters from "@/components/ui/RequestCounters";
import { useAuth } from "@/providers/AuthProvider";

export default function PanelHomePage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Resumen</h1>
        <p className="text-on-surface-variant mt-1 text-sm sm:text-base">
          {user?.fullName ? `Hola, ${user.fullName}. ` : ""}
          Estado general de las solicitudes activas en SARA.
        </p>
      </div>

      <section aria-labelledby="solicitudes-heading">
        <h2 id="solicitudes-heading" className="text-lg font-semibold text-on-surface mb-3">
          Solicitudes
        </h2>
        <RequestCounters />
      </section>
    </div>
  );
}

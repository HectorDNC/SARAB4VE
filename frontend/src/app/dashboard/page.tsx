"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listUsers } from "@/api/user";
import { MOCK_USERS } from "@/hooks/mockDataDashboard";
import { alertService } from "@/services/alertService";
import { USE_MOCK } from "@/types";

export default function DashboardHomePage() {
  const [pendingVolunteers, setPendingVolunteers] = useState(0);
  const [pendingOrganizations, setPendingOrganizations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      setIsLoading(true);

      if (USE_MOCK) {
        const volunteers = MOCK_USERS.filter((u) => u.status === "pending" && u.role === "volunteer").length;
        const organizations = MOCK_USERS.filter((u) => u.status === "pending" && u.role === "organization").length;
        setPendingVolunteers(volunteers);
        setPendingOrganizations(organizations);
        setIsLoading(false);
        return;
      }

      try {
        const [volunteersRes, organizationsRes] = await Promise.all([
          listUsers({ role: "volunteer", status: "pending", limit: 1 }),
          listUsers({ role: "organization", status: "pending", limit: 1 }),
        ]);

        setPendingVolunteers(volunteersRes.data.total);
        setPendingOrganizations(organizationsRes.data.total);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los contadores.";
        alertService.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadCounts();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Resumen</h1>
        <p className="text-on-surface-variant mt-1 text-sm sm:text-base">
          Vista general del panel administrativo de SARA.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/voluntarios"
          className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-rounded text-3xl text-primary" aria-hidden="true">
            volunteer_activism
          </span>
          <p className="text-2xl font-bold text-on-surface mt-3">
            {isLoading ? "..." : pendingVolunteers}
          </p>
          <p className="text-sm text-on-surface-variant">Voluntarios pendientes de aprobación</p>
        </Link>

        <Link
          href="/dashboard/organizaciones"
          className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-rounded text-3xl text-primary" aria-hidden="true">
            corporate_fare
          </span>
          <p className="text-2xl font-bold text-on-surface mt-3">
            {isLoading ? "..." : pendingOrganizations}
          </p>
          <p className="text-sm text-on-surface-variant">Organizaciones pendientes de aprobación</p>
        </Link>
      </div>
    </div>
  );
}
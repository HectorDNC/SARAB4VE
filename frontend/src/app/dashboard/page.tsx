"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserStats } from "@/api/user";
import { MOCK_USERS } from "@/hooks/mockDataDashboard";
import { alertService } from "@/services/alertService";
import { USE_MOCK, type ApiUser, type STATUS_USERS, type UserStats, type UserStatsByRole } from "@/types";

const EMPTY_STATS: UserStatsByRole = { total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 };

const STATUS_LABELS: { key: STATUS_USERS; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "suspended", label: "Suspendidos" },
];

function buildStatsFromMockUsers(users: ApiUser[]): UserStats {
  const stats: UserStats = {
    citizen: { ...EMPTY_STATS },
    volunteer: { ...EMPTY_STATS },
    organization: { ...EMPTY_STATS },
    admin: { ...EMPTY_STATS },
  };

  for (const user of users) {
    stats[user.role].total += 1;
    stats[user.role][user.status] += 1;
  }

  return stats;
}

function RoleStatCard({
  href,
  icon,
  title,
  stats,
}: {
  href: string;
  icon: string;
  title: string;
  stats: UserStatsByRole;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 hover:bg-surface-container transition-colors"
    >
      <span className="material-symbols-rounded text-3xl text-primary" aria-hidden="true">
        {icon}
      </span>
      <p className="text-3xl font-bold text-on-surface mt-3">{stats.total}</p>
      <p className="text-sm text-on-surface-variant">{title}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {STATUS_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-xl bg-surface-container px-3 py-2">
            <p className="font-semibold text-on-surface">{stats[key]}</p>
            <p className="text-xs text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);

      if (USE_MOCK) {
        setStats(buildStatsFromMockUsers(MOCK_USERS));
        setIsLoading(false);
        return;
      }

      try {
        const data = await getUserStats();
        setStats(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar las estadísticas.";
        alertService.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Resumen</h1>
        <p className="text-on-surface-variant mt-1 text-sm sm:text-base">
          Vista general del panel administrativo de SARA.
        </p>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant text-sm">Cargando estadísticas...</p>
      ) : (
        stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RoleStatCard
                href="/dashboard/voluntarios"
                icon="volunteer_activism"
                title="Voluntarios registrados"
                stats={stats.volunteer}
              />
              <RoleStatCard
                href="/dashboard/organizaciones"
                icon="corporate_fare"
                title="Organizaciones registradas"
                stats={stats.organization}
              />
            </div>

            <Link
              href="/dashboard/administradores"
              className="mt-4 flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-6 hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-rounded text-3xl text-primary" aria-hidden="true">
                admin_panel_settings
              </span>
              <div>
                <p className="text-3xl font-bold text-on-surface">{stats.admin.total}</p>
                <p className="text-sm text-on-surface-variant">Administradores registrados</p>
              </div>
            </Link>
          </>
        )
      )}
    </div>
  );
}

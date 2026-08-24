"use client";

import { useUserList } from "@/hooks/useUserList";
import Pagination from "@/components/layout/dashboard/Pagination";
import Button from "@/components/ui/Button";

export default function AdministradoresPage() {
  const {
    users,
    total,
    totalPages,
    page,
    setPage,
    search,
    updateSearch,
    isLoading,
  } = useUserList("admin");

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Administradores</h1>
          <p className="text-on-surface-variant mt-1 text-sm sm:text-base">
            {total} administrador{total !== 1 ? "es" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button href="/dashboard/administradores/nuevo" icon="person_add">
          Nuevo administrador
        </Button>
      </div>

      <div className="relative mb-5">
        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl" aria-hidden="true">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-background pl-11 pr-4 py-2.5 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-low overflow-hidden">
        {isLoading ? (
          <p className="text-center text-on-surface-variant py-10 text-sm">Cargando...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-on-surface-variant py-10 text-sm">
            No hay administradores que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="divide-y divide-outline-variant">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface">{user.fullName}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">{user.email}</p>
                  {user.zone && (
                    <p className="text-xs text-on-surface-variant mt-1 inline-flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm" aria-hidden="true">location_on</span>
                      {user.zone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

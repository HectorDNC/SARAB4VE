import type { STATUS_USERS } from "@/types/index";

const STATUS_FILTERS: { value: STATUS_USERS | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
  { value: "suspended", label: "Suspendidos" },
];

interface UserListControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: STATUS_USERS | "all";
  onStatusChange: (value: STATUS_USERS | "all") => void;
}

export default function UserListControls({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: UserListControlsProps) {
  return (
    <div className="space-y-3 mb-5">
      <div className="relative">
        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl" aria-hidden="true">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-background pl-11 pr-4 py-2.5 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onStatusChange(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-on-primary"
                : "border border-outline-variant text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
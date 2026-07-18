import type { STATUS_USERS } from "@/types/index";

const STATUS_CONFIG: Record<STATUS_USERS, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-[color:var(--color-warning-container)] text-[color:var(--color-on-warning-container)]" },
  approved: { label: "Aprobado", className: "bg-[color:var(--color-success-container)] text-[color:var(--color-on-success-container)]" },
  rejected: { label: "Rechazado", className: "bg-error-container text-on-error-container" },
  suspended: { label: "Suspendido", className: "bg-error-container text-on-error-container" },
};

export default function StatusBadge({ status }: { status: STATUS_USERS }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
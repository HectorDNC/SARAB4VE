interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-outline-variant disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
        aria-label="Página anterior"
      >
        <span className="material-symbols-rounded text-xl" aria-hidden="true">chevron_left</span>
      </button>

      <span className="text-sm text-on-surface-variant px-2">
        Página {page + 1} de {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-outline-variant disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
        aria-label="Página siguiente"
      >
        <span className="material-symbols-rounded text-xl" aria-hidden="true">chevron_right</span>
      </button>
    </div>
  );
}
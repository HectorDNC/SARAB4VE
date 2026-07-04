interface StepInitialStatusProps {
  isInjured: boolean | null;
  cannotMove: boolean | null;
  onInjuredChange: (value: boolean) => void;
  onCannotMoveChange: (value: boolean) => void;
}

export default function StepInitialStatus({
  isInjured,
  cannotMove,
  onInjuredChange,
  onCannotMoveChange,
}: StepInitialStatusProps) {
  return (
    <section aria-labelledby="step-1-title" className="max-w-3xl w-full mx-auto">
      <h2 id="step-1-title" className="text-lg sm:text-xl font-bold text-on-surface">1) Estado inicial</h2>
      <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-on-surface-variant">Responde rápido para priorizar riesgo.</p>

      {/* ── ¿Herida? ── */}
      <div className="mt-4 sm:mt-5 rounded-2xl border border-outline p-3 sm:p-4">
        <p className="text-sm sm:text-base font-semibold text-on-surface mb-3 sm:mb-4 text-center">¿Tienes alguna herida?</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onInjuredChange(true)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              isInjured === true
                ? "border-error bg-error text-on-error shadow-lg shadow-error/20"
                : "border-outline bg-surface text-on-surface hover:border-error/40 hover:bg-error/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">emergency</span>
            <span className="text-sm sm:text-base font-extrabold">Sí, estoy herido/a</span>
          </button>

          <button
            type="button"
            onClick={() => onInjuredChange(false)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              isInjured === false
                ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "border-outline bg-surface text-on-surface hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">check_circle</span>
            <span className="text-sm sm:text-base font-extrabold">No, estoy bien</span>
          </button>
        </div>
      </div>

      {/* ── ¿Movilidad? ── */}
      <div className="mt-3 sm:mt-4 rounded-2xl border border-outline p-3 sm:p-4">
        <p className="text-sm sm:text-base font-semibold text-on-surface mb-3 sm:mb-4 text-center">¿Puedes moverte por tu cuenta?</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onCannotMoveChange(false)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              cannotMove === false
                ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "border-outline bg-surface text-on-surface hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">directions_walk</span>
            <span className="text-sm sm:text-base font-extrabold">Sí, puedo moverme</span>
          </button>

          <button
            type="button"
            onClick={() => onCannotMoveChange(true)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              cannotMove === true
                ? "border-error bg-error text-on-error shadow-lg shadow-error/20"
                : "border-outline bg-surface text-on-surface hover:border-error/40 hover:bg-error/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">accessible</span>
            <span className="text-sm sm:text-base font-extrabold">No, necesito ayuda</span>
          </button>
        </div>
      </div>
    </section>
  );
}

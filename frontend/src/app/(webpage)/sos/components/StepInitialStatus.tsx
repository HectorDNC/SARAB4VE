import dynamic from "next/dynamic";
import { type LocationStatus } from "./types";

const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-36 sm:h-44 rounded-2xl border-2 border-outline-variant bg-surface-container-low flex items-center justify-center">
      <span className="material-symbols-rounded text-3xl text-on-surface-variant animate-pulse">map</span>
    </div>
  ),
});

interface StepInitialStatusProps {
  isInjured: boolean | null;
  cannotMove: boolean | null;
  latitude: number | null;
  longitude: number | null;
  locationStatus: LocationStatus;
  onInjuredChange: (value: boolean) => void;
  onCannotMoveChange: (value: boolean) => void;
  onRetryLocation: () => void;
}

export default function StepInitialStatus({
  isInjured,
  cannotMove,
  latitude,
  longitude,
  locationStatus,
  onInjuredChange,
  onCannotMoveChange,
  onRetryLocation,
}: StepInitialStatusProps) {
  const hasLocation = latitude !== null && longitude !== null && locationStatus === "ready";

  return (
    <section aria-labelledby="step-1-title" className="max-w-3xl w-full mx-auto">
      <h2 id="step-1-title" className="text-lg sm:text-xl font-bold text-on-surface">1) Geolocalización y estado inicial</h2>
      <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-on-surface-variant">Confirma tu ubicación y responde rápido para priorizar riesgo.</p>

      {/* ── Mini mapa con ubicación detectada (Requisito 2.1) ── */}
      <div className="mt-3 sm:mt-4">
        {hasLocation ? (
          <MiniMap latitude={latitude!} longitude={longitude!} label="Estás aquí" />
        ) : (
          <div className="w-full h-36 sm:h-44 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low flex flex-col items-center justify-center gap-2">
            <span className={`material-symbols-rounded text-4xl ${locationStatus === "loading" ? "animate-spin text-primary" : "text-on-surface-variant"}`}>
              {locationStatus === "loading" ? "sync" : "location_off"}
            </span>
            <p className="text-xs sm:text-sm font-medium text-on-surface-variant text-center px-4">
              {locationStatus === "loading"
                ? "Detectando tu ubicación…"
                : "Activa el GPS para mostrar tu ubicación en el mapa"}
            </p>
            {locationStatus === "error" && (
              <button
                type="button"
                onClick={onRetryLocation}
                className="mt-1 min-h-9 rounded-xl border-2 border-primary px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 active:scale-95 transition-all"
              >
                Reintentar ubicación
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── ¿Herida? ── */}
      <div className="mt-4 sm:mt-5 rounded-2xl border border-outline p-3 sm:p-4" role="radiogroup" aria-label="¿Tienes alguna herida?" aria-required="true">
        <p className="text-sm sm:text-base font-semibold text-on-surface mb-3 sm:mb-4 text-center" id="injury-label">¿Tienes alguna herida?</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            role="radio"
            aria-checked={isInjured === true}
            aria-labelledby="injury-label injury-yes"
            onClick={() => onInjuredChange(true)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              isInjured === true
                ? "border-error bg-error text-on-error shadow-lg shadow-error/20"
                : "border-outline bg-surface text-on-surface hover:border-error/40 hover:bg-error/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">emergency</span>
            <span id="injury-yes" className="text-sm sm:text-base font-extrabold">Sí, estoy herido/a</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={isInjured === false}
            aria-labelledby="injury-label injury-no"
            onClick={() => onInjuredChange(false)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              isInjured === false
                ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "border-outline bg-surface text-on-surface hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">check_circle</span>
            <span id="injury-no" className="text-sm sm:text-base font-extrabold">No, estoy bien</span>
          </button>
        </div>
      </div>

      {/* ── ¿Movilidad? ── */}
      <div className="mt-3 sm:mt-4 rounded-2xl border border-outline p-3 sm:p-4" role="radiogroup" aria-label="¿Puedes moverte por tu cuenta?" aria-required="true">
        <p className="text-sm sm:text-base font-semibold text-on-surface mb-3 sm:mb-4 text-center" id="mobility-label">¿Puedes moverte por tu cuenta?</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            role="radio"
            aria-checked={cannotMove === false}
            aria-labelledby="mobility-label mobility-yes"
            onClick={() => onCannotMoveChange(false)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              cannotMove === false
                ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "border-outline bg-surface text-on-surface hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">directions_walk</span>
            <span id="mobility-yes" className="text-sm sm:text-base font-extrabold">Sí, puedo moverme</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={cannotMove === true}
            aria-labelledby="mobility-label mobility-no"
            onClick={() => onCannotMoveChange(true)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 ${
              cannotMove === true
                ? "border-error bg-error text-on-error shadow-lg shadow-error/20"
                : "border-outline bg-surface text-on-surface hover:border-error/40 hover:bg-error/5"
            }`}
          >
            <span className="material-symbols-rounded text-4xl sm:text-5xl" aria-hidden="true">accessible</span>
            <span id="mobility-no" className="text-sm sm:text-base font-extrabold">No, necesito ayuda</span>
          </button>
        </div>
      </div>
    </section>
  );
}

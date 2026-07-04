import { type LocationStatus } from "./types";

interface StepNameAndLocationProps {
  requesterName: string;
  extraInfo: string;
  locationStatus: LocationStatus;
  locationError: string;
  onRequesterNameChange: (value: string) => void;
  onExtraInfoChange: (value: string) => void;
  onRetryLocation: () => void;
}

export default function StepNameAndLocation({
  requesterName,
  extraInfo,
  locationStatus,
  locationError,
  onRequesterNameChange,
  onExtraInfoChange,
  onRetryLocation,
}: StepNameAndLocationProps) {

  const locationIcon = () => {
    switch (locationStatus) {
      case "loading":
        return "sync";
      case "ready":
        return "my_location";
      case "error":
        return "location_off";
      default:
        return "location_searching";
    }
  };

  const locationLabel = () => {
    switch (locationStatus) {
      case "loading":
        return "Obteniendo ubicación exacta...";
      case "ready":
        return "¡Ubicación lista para enviar SOS!";
      case "error":
        return locationError || "No se pudo obtener la ubicación.";
      default:
        return "Aún no se ha solicitado la ubicación.";
    }
  };

  const isLocationOk = locationStatus === "ready";

  return (
    <section aria-labelledby="step-3-title" className="max-w-3xl w-full mx-auto">
      <h2 id="step-3-title" className="text-lg sm:text-xl font-bold text-on-surface">3) Nombre y ubicación</h2>
      <div className="mt-3 sm:mt-4 grid sm:grid-cols-2 gap-2 sm:gap-3">
        <label className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-on-surface">
          Nombre o alias
          <input
            value={requesterName}
            onChange={(event) => onRequesterNameChange(event.target.value)}
            className="min-h-11 sm:min-h-12 rounded-xl border border-outline bg-surface px-3 py-2.5 text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            placeholder="Ej. María"
            autoComplete="name"
          />
        </label>

        <label className="sm:col-span-2 flex flex-col gap-1 text-xs sm:text-sm font-semibold text-on-surface">
          Información o referencia de ubicación (opcional)
          <input
            value={extraInfo}
            onChange={(event) => onExtraInfoChange(event.target.value)}
            className="min-h-11 sm:min-h-12 rounded-xl border border-outline bg-surface px-3 py-2.5 text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            placeholder="Ej. Frente a la plaza Bolívar, edificio azul"
          />
        </label>
      </div>

      <div className={`mt-3 sm:mt-4 rounded-2xl border-2 p-3 sm:p-4 transition-colors ${
        isLocationOk ? "border-success bg-success-container/40" : "border-outline-variant bg-surface"
      }`}>
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`material-symbols-rounded text-3xl sm:text-4xl ${
              isLocationOk ? "text-success" : locationStatus === "error" ? "text-error" : "text-on-surface-variant"
            }`} aria-hidden="true">
              {locationIcon()}
            </span>
            <p className="text-xs sm:text-sm font-semibold text-on-surface">Estado de ubicación</p>
          </div>
          <button
            type="button"
            onClick={onRetryLocation}
            className="min-h-9 sm:min-h-10 rounded-xl border-2 border-outline px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-on-surface hover:bg-surface-container active:scale-95 transition-all"
          >
            Reintentar
          </button>
        </div>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base font-semibold text-on-surface" aria-live="polite">
          {locationLabel()}
        </p>
      </div>
    </section>
  );
}

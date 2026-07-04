import {
  communicationOptions,
  disabilityOptions,
  type CommunicationMode,
  type DisabilityType,
} from "./types";

interface StepDisabilityTypeProps {
  disabilityType: DisabilityType | null;
  communicationMode: CommunicationMode | null;
  onDisabilityTypeChange: (value: DisabilityType) => void;
  onCommunicationModeChange: (value: CommunicationMode) => void;
}

export default function StepDisabilityType({
  disabilityType,
  communicationMode,
  onDisabilityTypeChange,
  onCommunicationModeChange,
}: StepDisabilityTypeProps) {
  return (
    <section aria-labelledby="step-2-title" className="max-w-3xl w-full mx-auto">
      <h2 id="step-2-title" className="text-lg sm:text-xl font-bold text-on-surface">2) Tipo de discapacidad</h2>
      <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-on-surface-variant">Selecciona la prioridad para adaptar la asistencia.</p>

      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        {disabilityOptions.map((option) => {
          const selected = disabilityType === option.id;
          return (
            <button
              type="button"
              key={option.id}
              onClick={() => onDisabilityTypeChange(option.id)}
              className={`flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-2xl border-2 p-4 sm:p-5 transition-all active:scale-95 text-center ${
                selected
                  ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary/20"
                  : "border-outline bg-surface text-on-surface hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span className={`material-symbols-rounded text-4xl sm:text-5xl ${selected ? "text-on-primary" : "text-primary"}`} aria-hidden="true">
                {option.icon}
              </span>
              <div>
                <p className={`font-extrabold text-sm sm:text-base ${selected ? "text-on-primary" : "text-on-surface"}`}>
                  {option.title}
                </p>
                <p className={`text-[11px] sm:text-xs mt-0.5 sm:mt-1 leading-tight ${selected ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                  {option.hint}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {disabilityType === "auditiva" && (
        <div className="mt-3 sm:mt-4 rounded-2xl border-2 border-outline p-3 sm:p-4">
          <p className="text-sm sm:text-base font-semibold text-on-surface mb-2 sm:mb-3 text-center">Subcategoría de comunicación</p>
          <div className="grid grid-cols-2 gap-2">
            {communicationOptions.map((option) => {
              const selected = communicationMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onCommunicationModeChange(option.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 sm:p-4 transition-all active:scale-95 ${
                    selected
                      ? "border-primary bg-primary text-on-primary shadow-md shadow-primary/15"
                      : "border-outline bg-surface text-on-surface hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <span className={`material-symbols-rounded text-3xl sm:text-4xl ${selected ? "text-on-primary" : "text-primary"}`} aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-center">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { type LocationStatus, type VoiceNote } from "./types";

const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-36 sm:h-44 rounded-2xl border-2 border-outline-variant bg-surface-container-low flex items-center justify-center">
      <span className="material-symbols-rounded text-3xl text-on-surface-variant animate-pulse">map</span>
    </div>
  ),
});

interface StepNameAndLocationProps {
  requesterName: string;
  extraInfo: string;
  voiceNote: VoiceNote | null;
  latitude: number | null;
  longitude: number | null;
  locationStatus: LocationStatus;
  locationError: string;
  onRequesterNameChange: (value: string) => void;
  onExtraInfoChange: (value: string) => void;
  onVoiceNoteChange: (note: VoiceNote | null) => void;
  onRetryLocation: () => void;
  // Accessibility feedback controls
  disabilityType?: "visual" | "auditiva" | "neuro" | "motriz" | null;
  enableConfirmOnSend?: boolean;
  enableEnCaminoAlerts?: boolean;
  onToggleConfirm?: (v: boolean) => void;
  onToggleEnCamino?: (v: boolean) => void;
  onPreviewFeedback?: (type: "confirm" | "encamino") => void;
}

export default function StepNameAndLocation({
  requesterName,
  extraInfo,
  voiceNote,
  latitude,
  longitude,
  locationStatus,
  locationError,
  onRequesterNameChange,
  onExtraInfoChange,
  onVoiceNoteChange,
  onRetryLocation,
  disabilityType = null,
  enableConfirmOnSend = false,
  enableEnCaminoAlerts = false,
  onToggleConfirm,
  onToggleEnCamino,
  onPreviewFeedback,
}: StepNameAndLocationProps) {
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const hasLocation = latitude !== null && longitude !== null && locationStatus === "ready";

  // ── Grabadora de voz (Requisito 2.4) ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        onVoiceNoteChange({ blob, url, durationSec: recordingSec });
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      setRecordingSec(0);
      timerRef.current = setInterval(() => {
        setRecordingSec((prev) => prev + 1);
      }, 1000);

      recorder.start();
      setRecording(true);
    } catch {
      // Permiso denegado o no soportado — simplemente no se graba
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discardVoiceNote = () => {
    if (voiceNote) URL.revokeObjectURL(voiceNote.url);
    onVoiceNoteChange(null);
  };

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
          Información o referencia de ubicación
          {locationStatus != "error" && ( 
            <span>(opcional)</span> 
          )}
          <input
            value={extraInfo}
            onChange={(event) => onExtraInfoChange(event.target.value)}
            className="min-h-11 sm:min-h-12 rounded-xl border border-outline bg-surface px-3 py-2.5 text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            placeholder="Ej. Frente a la plaza Bolívar, edificio azul"
          />
        </label>
      </div>

      <div className="mt-3 sm:mt-4 rounded-2xl border-2 border-outline p-3 sm:p-4">
        <p className="text-xs sm:text-sm font-semibold text-on-surface mb-2 sm:mb-3 text-center">
          Nota de voz (opcional)
        </p>

        {voiceNote ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-rounded text-2xl text-primary shrink-0" aria-hidden="true">mic</span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-on-surface truncate">Nota de voz grabada</p>
                <p className="text-[11px] text-on-surface-variant">{voiceNote.durationSec}s de audio</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const audio = new Audio(voiceNote.url);
                  audio.play();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary hover:opacity-80 transition-opacity"
                aria-label="Reproducir nota de voz"
              >
                <span className="material-symbols-rounded text-sm">play_arrow</span>
              </button>
              <button
                type="button"
                onClick={discardVoiceNote}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Descartar nota de voz"
              >
                <span className="material-symbols-rounded text-sm">delete</span>
              </button>
            </div>
          </div>
        ) : recording ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-error/5 border border-error/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-error animate-ping opacity-30"></span>
                <span className="material-symbols-rounded text-2xl text-error">mic</span>
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-error">Grabando…</p>
                <p className="text-[11px] text-on-surface-variant">{recordingSec}s</p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="min-h-9 rounded-xl bg-error px-4 py-1.5 text-xs font-bold text-on-error hover:opacity-90 active:scale-95 transition-all"
            >
              Detener
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant py-3 text-xs sm:text-sm font-semibold text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-rounded text-xl">mic</span>
            Toca para grabar un mensaje de voz
          </button>
        )}
      </div>
      {/* Opciones de alerta háptica/visual para usuarios con discapacidad auditiva o visual */}
      {(disabilityType === "auditiva" || disabilityType === "visual") && (
        <div className="mt-3 sm:mt-4 rounded-2xl border-2 border-outline p-3 sm:p-4">
          <p className="text-sm sm:text-base font-semibold text-on-surface mb-2 sm:mb-3 text-center">Alertas</p>

          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs sm:text-sm font-semibold">Alerta "En camino"</p>
              <p className="text-[11px] text-on-surface-variant">Vibración + destello cuando un voluntario está en camino</p>
            </div>
            <input
              type="checkbox"
              checked={enableEnCaminoAlerts}
              onChange={(e) => onToggleEnCamino?.(e.target.checked)}
              aria-label="Activar alerta háptica y visual cuando un voluntario esté en camino"
            />
          </label>
        </div>
      )}

      {/* ── Mini mapa + Estado de ubicación ── */}
      <div className="mt-3 sm:mt-4">
        {hasLocation ? (
          <MiniMap latitude={latitude!} longitude={longitude!} label="Tu ubicación" />
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

      {/* Estado de ubicación (texto compacto siempre visible) */}
      <div className={`mt-2 sm:mt-3 rounded-xl border p-3 transition-colors ${
        hasLocation ? "border-success/40 bg-success-container/40" : locationStatus === "error" ? "border-error/40 bg-error-container/40" : "border-outline-variant bg-surface"
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className={`material-symbols-rounded text-2xl shrink-0 ${
              hasLocation ? "text-success" : locationStatus === "error" ? "text-error" : "text-on-surface-variant"
            }`} aria-hidden="true">
              {locationIcon()}
            </span>
            <p className="text-xs sm:text-sm font-semibold text-on-surface truncate" aria-live="polite">
              {locationLabel()}
            </p>
          </div>
          {!hasLocation && (
            <button
              type="button"
              onClick={onRetryLocation}
              className="min-h-9 sm:min-h-10 rounded-xl border-2 border-outline px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-on-surface hover:bg-surface-container active:scale-95 transition-all shrink-0"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

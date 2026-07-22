"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sendEmergency } from "@/api/emergencies";
import { alertService } from "@/services/alertService";
import { useLocation } from "@/hooks/useLocation";
import { useFabVisibility } from "@/providers/FabVisibilityProvider";
import StepDisabilityType from "./components/StepDisabilityType";
import StepInitialStatus from "./components/StepInitialStatus";
import StepNameAndLocation from "./components/StepNameAndLocation";
import AccessibilityToolbar from "@/components/layout/AccessibilityToolbar";
import {
  type CommunicationMode,
  type DisabilityType,
  type LocationStatus,
  type VisualSubcategory,
  type NeuroSubcategory,
  type MotrizSubcategory,
  type VoiceNote,
} from "./components/types";

function mapNeedType(
  disabilityType: DisabilityType,
  communicationMode: CommunicationMode | null,
  visualSubcategory: VisualSubcategory | null,
  neuroSubcategory: NeuroSubcategory | null,
  motrizSubcategory: MotrizSubcategory | null,
): string {
  switch (disabilityType) {
    case "visual":
      return visualSubcategory ? `visual_${visualSubcategory}` : "accessible_information";
    case "auditiva":
      return communicationMode ? `hearing_${communicationMode}` : "interpreter";
    case "neuro":
      return neuroSubcategory ? `neuro_${neuroSubcategory}` : "neurodivergent_support";
    case "motriz":
      return motrizSubcategory ? `motor_${motrizSubcategory}` : "transport";
    default:
      return "companionship";
  }
}

function mapUrgency(isInjured: boolean, cannotMove: boolean): "medium" | "high" | "critical" {
  if (isInjured || cannotMove) {
    return "critical";
  }

  return "high";
}

const FALLBACK_EMERGENCY_COORDINATES = {
  latitude: 10.4806,
  longitude: -66.9036,
};

export default function SOSFlowPage() {
  const {
    location,
    status: globalLocationStatus,
    error: globalLocationError,
    requestLocation,
  } = useLocation();

  // En `/sos` el FAB de voz convive con el formulario de emergencia,
  // por lo que lo minimizamos desde el instante en que el usuario
  // entra a la ruta, igual que ocurre en `/request`. Cuando abandona
  // la ruta (unmount) o el foco sale de un input (onBlur), el FAB
  // vuelve a su tamaño completo.
  const { setFormFocused } = useFabVisibility();

  const [isInjured, setIsInjured] = useState<boolean | null>(null);
  const [cannotMove, setCannotMove] = useState<boolean | null>(null);
  const [disabilityType, setDisabilityType] = useState<DisabilityType | null>(null);
  const [communicationMode, setCommunicationMode] = useState<CommunicationMode | null>(null);
  const [visualSubcategory, setVisualSubcategory] = useState<VisualSubcategory | null>(null);
  const [neuroSubcategory, setNeuroSubcategory] = useState<NeuroSubcategory | null>(null);
  const [motrizSubcategory, setMotrizSubcategory] = useState<MotrizSubcategory | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [voiceNote, setVoiceNote] = useState<VoiceNote | null>(null);
  const [enableEnCaminoAlerts, setEnableEnCaminoAlerts] = useState(true);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(globalLocationStatus);
  const [locationError, setLocationError] = useState(globalLocationError);
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const TOTAL_STEPS = 3;

  // Sincronizar el estado local con el contexto global de ubicación
  useEffect(() => {
    setLocationStatus(globalLocationStatus);
    setLocationError(globalLocationError);
  }, [globalLocationStatus, globalLocationError]);

  // Al entrar a SOS, pedir ubicación inmediatamente si no está lista
  useEffect(() => {
    if (globalLocationStatus !== "ready" && globalLocationStatus !== "loading") {
      requestLocation();
    }
    // Solo ejecutar al montar la página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Minimizar el FAB desde el mount (mismo comportamiento que en
  // /request). Al salir de la ruta restauramos `isFormFocused = false`
  // para que en otras vistas el FAB vuelva a su tamaño completo.
  useEffect(() => {
    setFormFocused(true);
    return () => {
      setFormFocused(false);
    };
  }, [setFormFocused]);

  const goToStep = (nextStep: number) => {
    if (nextStep === currentStep || nextStep < 1 || nextStep > TOTAL_STEPS) {
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentStep(nextStep);
      setIsTransitioning(false);
    }, 140);
  };

  // ── Auto-avance al completar selecciones ──
  useEffect(() => {
    if (currentStep === 1 && isInjured !== null && cannotMove !== null) {
      const timer = window.setTimeout(() => goToStep(2), 350);
      return () => window.clearTimeout(timer);
    }
  }, [isInjured, cannotMove, currentStep]);

  useEffect(() => {
    if (currentStep === 2 && disabilityType !== null) {
      const needsSubcategory =
        (disabilityType === "auditiva" && communicationMode === null) ||
        (disabilityType === "visual" && visualSubcategory === null) ||
        (disabilityType === "neuro" && neuroSubcategory === null) ||
        (disabilityType === "motriz" && motrizSubcategory === null);

      if (!needsSubcategory) {
        const timer = window.setTimeout(() => goToStep(3), 350);
        return () => window.clearTimeout(timer);
      }
    }
  }, [disabilityType, communicationMode, visualSubcategory, neuroSubcategory, motrizSubcategory, currentStep]);

  const description = useMemo(() => {
    const hasManualReference = extraInfo.trim().length > 3;
    const hasGeolocation = location !== null && locationStatus === "ready";
    const blocks = [
      `Estado inicial: herido=${isInjured ? "si" : "no"}; movilidad_reducida=${cannotMove ? "si" : "no"}.`,
      `Discapacidad prioritaria: ${disabilityType ?? "no definida"}.`,
      disabilityType === "auditiva" ? `Subcategoria comunicacion: ${communicationMode ?? "sin definir"}.` : null,
      disabilityType === "visual" ? `Subcategoria visual: ${visualSubcategory ?? "sin definir"}.` : null,
      disabilityType === "neuro" ? `Subcategoria neuro: ${neuroSubcategory ?? "sin definir"}.` : null,
      disabilityType === "motriz" ? `Subcategoria motriz: ${motrizSubcategory ?? "sin definir"}.` : null,
      extraInfo.trim() ? `Info adicional: ${extraInfo.trim()}.` : null,
      voiceNote ? `Nota de voz adjunta (${voiceNote.durationSec}s).` : null,
      hasManualReference && !hasGeolocation ? "Ubicacion enviada con referencia manual (sin GPS)." : null,
    ].filter(Boolean);

    return blocks.join(" ");
  }, [cannotMove, communicationMode, disabilityType, extraInfo, isInjured, location, locationStatus, visualSubcategory, neuroSubcategory, motrizSubcategory, voiceNote]);

  const progress = useMemo(() => Math.round((currentStep / TOTAL_STEPS) * 100), [currentStep]);

  const canContinueStep1 = isInjured !== null && cannotMove !== null;
  const canContinueStep2 =
    disabilityType !== null &&
    (disabilityType !== "auditiva" || communicationMode !== null) &&
    (disabilityType !== "visual" || visualSubcategory !== null) &&
    (disabilityType !== "neuro" || neuroSubcategory !== null) &&
    (disabilityType !== "motriz" || motrizSubcategory !== null);
  const hasGeolocation = location !== null && locationStatus === "ready";
  const hasManualReference = extraInfo.trim().length > 3;
  const canContinueStep3 = hasGeolocation || hasManualReference;

  const canSubmit =
    isInjured !== null &&
    cannotMove !== null &&
    disabilityType !== null &&
    (disabilityType !== "auditiva" || communicationMode !== null) &&
    (disabilityType !== "visual" || visualSubcategory !== null) &&
    (disabilityType !== "neuro" || neuroSubcategory !== null) &&
    (disabilityType !== "motriz" || motrizSubcategory !== null) &&
    (hasGeolocation || hasManualReference);

  const handleDisabilityTypeChange = (value: DisabilityType) => {
    // Resetear subcategorías al cambiar de tipo de discapacidad
    setDisabilityType(value);
    setCommunicationMode(null);
    setVisualSubcategory(null);
    setNeuroSubcategory(null);
    setMotrizSubcategory(null);
  };

  const handleContinue = () => {
    if (currentStep === 1 && !canContinueStep1) {
      alertService.warning("Marca tu estado inicial para continuar.");
      return;
    }

    if (currentStep === 2 && !canContinueStep2) {
      alertService.warning("Selecciona el tipo de discapacidad y subcategoria si aplica.");
      return;
    }

    if (currentStep === 3 && !canContinueStep3) {
      alertService.warning("Activa ubicacion o agrega una referencia en informacion para enviar el SOS.");
      return;
    }

    if (currentStep === TOTAL_STEPS) {
      submitSOS();
      return;
    }

    goToStep(currentStep + 1);
  };

  const submitSOS = async () => {
    if (!canSubmit || !disabilityType || isInjured === null || cannotMove === null) {
      alertService.warning("Faltan datos clave para enviar tu SOS.");
      return;
    }

    const finalRequesterName = requesterName.trim() || "Persona en emergencia";
    const finalLatitude = hasGeolocation ? location!.latitude : FALLBACK_EMERGENCY_COORDINATES.latitude;
    const finalLongitude = hasGeolocation ? location!.longitude : FALLBACK_EMERGENCY_COORDINATES.longitude;

    // Determinar disabilitySubcategory según el tipo de discapacidad
    let disabilitySubcategory: string | null = null;
    if (disabilityType === "visual") {
      disabilitySubcategory = visualSubcategory;
    } else if (disabilityType === "neuro") {
      disabilitySubcategory = neuroSubcategory;
    } else if (disabilityType === "motriz") {
      disabilitySubcategory = motrizSubcategory;
    }

    setSubmitting(true);

    try {
      await sendEmergency({
        requesterName: finalRequesterName,
        isInjured,
        cannotMove,
        disabilityType,
        communicationMode: disabilityType === "auditiva" ? communicationMode : null,
        disabilitySubcategory,
        extraInfo: extraInfo.trim() || undefined,
        voiceNoteUrl: voiceNote?.url ?? null,
        voiceNoteDurationSec: voiceNote?.durationSec ?? null,
        latitude: finalLatitude,
        longitude: finalLongitude,
        urgency: mapUrgency(isInjured, cannotMove),
        needType: mapNeedType(disabilityType, communicationMode, visualSubcategory, neuroSubcategory, motrizSubcategory),
        description,
      });

      setSent(true);
      performFeedback("confirm");
      alertService.success("SOS enviado. Mantente en un lugar seguro.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar el SOS.";
      alertService.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Retroalimentación háptica + destellos visuales (para dispositivos que lo soportan)
  const performFeedback = (type: "confirm" | "encamino") => {
    const patterns: Record<string, number[]> = {
      confirm: [200, 100, 200],
      encamino: [400, 200, 400, 200, 400],
    };

    const pattern = patterns[type] ?? patterns.confirm;

    try {
      if (navigator && "vibrate" in navigator) {
        // @ts-ignore
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // ignore
    }

    // Crear un overlay temporal para el destello visual
    try {
      const overlay = document.createElement("div");
      overlay.setAttribute("role", "presentation");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.background = "rgba(255,255,224,0.9)";
      overlay.style.mixBlendMode = "screen";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 80ms linear";
      document.body.appendChild(overlay);

      let elapsed = 0;
      const timeouts: number[] = [];
      for (let i = 0; i < pattern.length; i++) {
        const on = i % 2 === 0;
        const duration = pattern[i];
        const t = window.setTimeout(() => {
          overlay.style.opacity = on ? "1" : "0";
        }, elapsed);
        timeouts.push(t as unknown as number);
        elapsed += duration;
      }

      const cleanup = window.setTimeout(() => {
        timeouts.forEach((id) => window.clearTimeout(id));
        overlay.remove();
      }, elapsed + 100);

      // Safety: cleanup after 4s
      window.setTimeout(() => {
        try {
          overlay.remove();
        } catch {}
        window.clearTimeout(cleanup);
      }, 4000);
    } catch (e) {
      // ignore visual feedback failures
    }
  };

  if (sent) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] px-3 sm:px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6 flex items-start lg:items-center justify-center" aria-live="polite">
        <div className="w-full max-w-3xl rounded-3xl border border-outline-variant bg-primary-fixed p-5 sm:p-6 lg:p-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-primary">
            <span className="material-symbols-rounded text-sm sm:text-base" aria-hidden="true">check_circle</span>
            SOS recibido
          </div>
          <h1 className="mt-3 sm:mt-4 text-xl sm:text-2xl lg:text-3xl font-bold text-on-surface leading-tight">Tu alerta ya está en nuestro mapa</h1>
          <p className="mt-2 sm:mt-3 text-on-surface-variant text-sm sm:text-base leading-relaxed">
            Ya notificamos a voluntarios y puntos de apoyo cercanos. No cierres esta ventana.
          </p>

          <div className="mt-5 sm:mt-7 grid gap-2 sm:gap-3 sm:grid-cols-2">
            <Link
              href="/mapa"
              className="min-h-12 sm:min-h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 sm:px-5 py-2.5 sm:py-3 font-bold text-on-primary text-sm sm:text-base hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-rounded" aria-hidden="true">map</span>
              Ver mapa de apoyo
            </Link>
            <Link
              href="/"
              className="min-h-12 sm:min-h-14 inline-flex items-center justify-center gap-2 rounded-2xl border border-outline px-4 sm:px-5 py-2.5 sm:py-3 font-semibold text-on-surface text-sm sm:text-base hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-rounded" aria-hidden="true">home</span>
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-3 sm:px-4 pt-3 sm:pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6 flex items-start lg:items-center justify-center" aria-labelledby="sos-title">
      <section className="w-full max-w-4xl rounded-3xl border border-outline-variant bg-surface-container-low shadow-xl flex flex-col min-h-[calc(90dvh-5rem)] lg:min-h-[calc(85dvh-5rem)] lg:max-h-[760px]">
        <header className="px-3 sm:px-5 lg:px-6 pt-3 sm:pt-4 lg:pt-5 pb-2 sm:pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-error/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-error">
                <span className="material-symbols-rounded text-xs sm:text-sm" aria-hidden="true">emergency</span>
                Modo emergencia
              </div>
              <h1 id="sos-title" className="mt-1.5 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-black text-on-surface leading-tight">Solicitud SOS Emergencia</h1>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-on-surface-variant shrink-0">Paso {currentStep}/{TOTAL_STEPS}</p>
            {/* Botón de accesibilidad grande y fijo en SOS */}
            <div className="shrink-0">
              <AccessibilityToolbar />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 rounded-full bg-surface-container-high overflow-hidden" aria-label="Progreso">
            <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5 transition-all duration-150 ${isTransitioning ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}`}>
          {currentStep === 1 && (
            <StepInitialStatus
              isInjured={isInjured}
              cannotMove={cannotMove}
              latitude={location?.latitude ?? null}
              longitude={location?.longitude ?? null}
              locationStatus={locationStatus}
              onInjuredChange={setIsInjured}
              onCannotMoveChange={setCannotMove}
              onRetryLocation={requestLocation}
            />
          )}

          {currentStep === 2 && (
            <StepDisabilityType
              disabilityType={disabilityType}
              communicationMode={communicationMode}
              visualSubcategory={visualSubcategory}
              neuroSubcategory={neuroSubcategory}
              motrizSubcategory={motrizSubcategory}
              onDisabilityTypeChange={handleDisabilityTypeChange}
              onCommunicationModeChange={setCommunicationMode}
              onVisualSubcategoryChange={setVisualSubcategory}
              onNeuroSubcategoryChange={setNeuroSubcategory}
              onMotrizSubcategoryChange={setMotrizSubcategory}
            />
          )}

          {currentStep === 3 && (
            <StepNameAndLocation
              requesterName={requesterName}
              extraInfo={extraInfo}
              voiceNote={voiceNote}
              latitude={location?.latitude ?? null}
              longitude={location?.longitude ?? null}
              locationStatus={locationStatus}
              locationError={locationError}
              onRequesterNameChange={setRequesterName}
              onExtraInfoChange={setExtraInfo}
              onVoiceNoteChange={setVoiceNote}
              onRetryLocation={requestLocation}
              disabilityType={disabilityType}
              enableEnCaminoAlerts={enableEnCaminoAlerts}
              onToggleEnCamino={setEnableEnCaminoAlerts}
              onPreviewFeedback={(t) => performFeedback(t)}
            />
          )}

        </div>

        <footer className="px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 border-t border-outline-variant flex gap-2 sm:gap-3 shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => goToStep(currentStep - 1)}
              className="flex-1 min-h-11 sm:min-h-12 rounded-xl border border-outline font-semibold text-on-surface text-sm sm:text-base hover:bg-surface-container transition-colors"
            >
              Atrás
            </button>
          ) : (
            <Link
              href="/"
              className="flex-1 min-h-11 sm:min-h-12 rounded-xl border border-outline font-semibold text-on-surface text-sm sm:text-base inline-flex items-center justify-center hover:bg-surface-container transition-colors"
            >
              Cancelar
            </Link>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={submitting || (currentStep === TOTAL_STEPS && !canSubmit)}
            className="flex-1 min-h-11 sm:min-h-12 rounded-xl bg-primary text-on-primary font-bold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {currentStep === TOTAL_STEPS ? (submitting ? "Enviando SOS..." : "Enviar SOS") : "Continuar"}
          </button>
        </footer>
      </section>
    </main>
  );
}

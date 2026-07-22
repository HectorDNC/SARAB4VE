"use client";

import { useEffect, type MouseEvent } from "react";
import { useFabVisibility } from "@/providers/FabVisibilityProvider";
import { voiceRecorderRequest } from "@/providers/VoiceRecorderStore";
import { useVoiceRecorderState } from "@/hooks/useVoiceRecorderState";

interface InlineMicButtonProps {
  /**
   * Etiqueta accesible (aria-label) del botón. Por defecto, en español.
   */
  ariaLabel?: string;
  /**
   * Si se provee, se renderiza un título (tooltip) adicional.
   */
  title?: string;
  /**
   * Clases extra para sobrescribir estilos de tamaño/posición cuando
   * el consumidor quiera una variante (p. ej. pequeño junto al label).
   */
  className?: string;
}

/**
 * Botón de micrófono inline pensado para colocarse junto al campo de
 * "Descripción de la emergencia" en rutas con formulario propio
 * (ej. `/request`). En lugar de montar su propio flujo de voz,
 * delega en el FAB flotante a través del store compartido
 * `VoiceRecorderStore`, de modo que:
 *   - No se duplican instancias de Web Speech API / MediaRecorder.
 *   - Los modales de consentimiento, preview y éxito del FAB siguen
 *     siendo la única fuente de verdad visual.
 *   - La indicación de "escuchando…" se refleja en ambos botones.
 *
 * Antes de usarlo, la página debe llamar a `setHideFAB(true)` (vía
 * `useFabVisibility`) para que el FAB se oculte y el inline tome el
 * control visual. Si el consumidor olvida hacerlo, este componente
 * lo activa en mount como red de seguridad.
 */
export default function InlineMicButton({
  ariaLabel = "Reportar emergencia por voz",
  title,
  className = "",
}: InlineMicButtonProps) {
  const { hideFAB, setHideFAB } = useFabVisibility();
  const { phase, pendingAction } = useVoiceRecorderState();

  // Garantiza que el FAB esté oculto cuando este botón se renderiza.
  // Usamos effect (no estado durante render) para evitar bucles.
  useEffect(() => {
    if (!hideFAB) {
      setHideFAB(true);
    }
  }, [hideFAB, setHideFAB]);

  const isListening = phase === "listening";
  const isProcessing = phase === "processing";

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    voiceRecorderRequest(isListening ? "stop" : "start");
  };

  // Mientras el FAB está procesando la acción solicitada, mostramos
  // un spinner para feedback inmediato.
  const showSpinner = isProcessing || pendingAction !== null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isProcessing}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      aria-pressed={isListening}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isListening
          ? "bg-red-800 text-white animate-pulse"
          : isProcessing
            ? "bg-yellow-600 text-white"
            : "bg-red-900 text-white hover:bg-red-800"
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span
        className={`material-symbols-rounded text-2xl ${
          showSpinner && !isListening ? "animate-spin" : ""
        }`}
        aria-hidden="true"
      >
        {showSpinner && !isListening ? "progress_activity" : "mic"}
      </span>
    </button>
  );
}

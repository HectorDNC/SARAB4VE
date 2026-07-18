"use client";

import { useCallback, useRef } from "react";

// ── Patrones de vibración háptica ──────────────────────────────────────────

/** Patrón para confirmaciones de envío exitoso. */
const SUCCESS_PATTERN: VibratePattern = [100, 50, 100];

/** Patrón para alertas/errores. */
const ALERT_PATTERN: VibratePattern = [200, 100, 200, 100, 200];

/** Patrón para advertencias. */
const WARNING_PATTERN: VibratePattern = [150, 50, 150];

/** Patrón para info. */
const INFO_PATTERN: VibratePattern = [50];

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface AccessibleFeedbackAPI {
  /** Vibración háptica (si el dispositivo lo soporta). */
  vibrate: (pattern: VibratePattern) => void;
  /** Vibración para confirmación exitosa. */
  vibrateSuccess: () => void;
  /** Vibración para alerta/error. */
  vibrateAlert: () => void;
  /** Vibración para advertencia. */
  vibrateWarning: () => void;
  /** Vibración informativa. */
  vibrateInfo: () => void;
  /**
   * Destello visual en un elemento.
   * Añade una clase CSS de destello que dura ~600ms.
   */
  flash: (element: HTMLElement | null) => void;
  /**
   * Destello visual global (en el body) para notificaciones
   * que no están asociadas a un elemento concreto.
   */
  flashGlobal: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAccessibleFeedback(): AccessibleFeedbackAPI {
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vibrate = useCallback((pattern: VibratePattern) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silencioso — algunos navegadores bloquean vibración sin gesto de usuario
      }
    }
  }, []);

  const vibrateSuccess = useCallback(() => vibrate(SUCCESS_PATTERN), [vibrate]);
  const vibrateAlert = useCallback(() => vibrate(ALERT_PATTERN), [vibrate]);
  const vibrateWarning = useCallback(() => vibrate(WARNING_PATTERN), [vibrate]);
  const vibrateInfo = useCallback(() => vibrate(INFO_PATTERN), [vibrate]);

  const flash = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Limpiar destello anterior si existe
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      element.classList.remove("a11y-flash-success", "a11y-flash-alert", "a11y-flash-warning");
    }

    // Determinar tipo de destello basado en contexto (por defecto success)
    element.classList.add("a11y-flash");

    flashTimerRef.current = setTimeout(() => {
      element.classList.remove("a11y-flash");
      flashTimerRef.current = null;
    }, 700);
  }, []);

  const flashGlobal = useCallback(() => {
    if (typeof document === "undefined") return;

    // Crear overlay de destello momentáneo
    const overlay = document.createElement("div");
    overlay.setAttribute("aria-hidden", "true");
    overlay.className = "a11y-global-flash";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999; pointer-events: none;
      animation: a11y-flash-overlay 600ms ease-out forwards;
    `;

    // Inyectar keyframes si no existen
    if (!document.getElementById("a11y-flash-styles")) {
      const style = document.createElement("style");
      style.id = "a11y-flash-styles";
      style.textContent = `
        @keyframes a11y-flash-overlay {
          0%   { background: rgba(255,255,255,0.35); }
          100% { background: rgba(255,255,255,0); }
        }
        .a11y-high-contrast .a11y-global-flash {
          animation: a11y-flash-overlay-hc 600ms ease-out forwards !important;
        }
        @keyframes a11y-flash-overlay-hc {
          0%   { background: rgba(255,255,0,0.45); }
          100% { background: rgba(255,255,0,0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
    }, 650);
  }, []);

  return {
    vibrate,
    vibrateSuccess,
    vibrateAlert,
    vibrateWarning,
    vibrateInfo,
    flash,
    flashGlobal,
  };
}

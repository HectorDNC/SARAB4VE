"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ── Tipos ──────────────────────────────────────────────────────────────────

export type FontSizeLevel = "normal" | "large" | "x-large";

export interface AccessibilitySettings {
  /** Nivel de escala de fuentes. */
  fontSize: FontSizeLevel;
  /** Modo de Alto Contraste (fondo negro, texto amarillo/blanco). */
  highContrast: boolean;
}

export interface AccessibilityContextValue extends AccessibilitySettings {
  /** Alterna el tamaño de fuente (normal → large → x-large → normal). */
  cycleFontSize: () => void;
  /** Activa/desactiva el modo de Alto Contraste. */
  toggleHighContrast: () => void;
  /** Restaura todas las configuraciones a sus valores por defecto. */
  reset: () => void;
}

// ── Constantes ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "sara-a11y-settings";

const FONT_SIZE_CYCLE: FontSizeLevel[] = ["normal", "large", "x-large"];

const DEFAULTS: AccessibilitySettings = {
  fontSize: "normal",
  highContrast: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function loadSettings(): AccessibilitySettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      fontSize: FONT_SIZE_CYCLE.includes(parsed.fontSize) ? parsed.fontSize : DEFAULTS.fontSize,
      highContrast: typeof parsed.highContrast === "boolean" ? parsed.highContrast : DEFAULTS.highContrast,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(settings: AccessibilitySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silencioso — localStorage puede no estar disponible
  }
}

// ── Contexto ───────────────────────────────────────────────────────────────

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULTS);

  // Hidratación desde localStorage
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Aplicar clases al <html> según los settings
  useEffect(() => {
    const root = document.documentElement;

    // Tamaño de fuente
    root.classList.remove("a11y-font-normal", "a11y-font-large", "a11y-font-x-large");
    root.classList.add(`a11y-font-${settings.fontSize}`);

    // Alto contraste
    if (settings.highContrast) {
      root.classList.add("a11y-high-contrast");
    } else {
      root.classList.remove("a11y-high-contrast");
    }
  }, [settings.fontSize, settings.highContrast]);

  // Persistir cambios
  useEffect(() => {
    persist(settings);
  }, [settings]);

  const cycleFontSize = useCallback(() => {
    setSettings((prev) => {
      const currentIdx = FONT_SIZE_CYCLE.indexOf(prev.fontSize);
      const nextIdx = (currentIdx + 1) % FONT_SIZE_CYCLE.length;
      return { ...prev, fontSize: FONT_SIZE_CYCLE[nextIdx] };
    });
  }, []);

  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS });
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...settings,
      cycleFontSize,
      toggleHighContrast,
      reset,
    }),
    [settings, cycleFontSize, toggleHighContrast, reset],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility debe usarse dentro de <AccessibilityProvider>");
  }
  return ctx;
}

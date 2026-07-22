"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface FabVisibilityContextValue {
  /**
   * Indica si algún input/textarea del formulario tiene foco.
   * El FAB debe minimizarse a 32px con opacidad 0.4 mientras sea `true`.
   */
  isFormFocused: boolean;
  /**
   * Cuando es `true`, el FAB se oculta por completo. Útil en rutas
   * con formulario propio (ej. `/request`) que prefieran mostrar un
   * micrófono inline junto al campo de descripción.
   */
  hideFAB: boolean;
  /** Marca el formulario como enfocado (típicamente desde `onFocus`). */
  setFormFocused: (focused: boolean) => void;
  /**
   * Pide ocultar el FAB por completo (ruta con formulario dedicado)
   * o volver al comportamiento FAB normal.
   */
  setHideFAB: (hidden: boolean) => void;
}

// ── Contexto ───────────────────────────────────────────────────────────────

const FabVisibilityContext = createContext<FabVisibilityContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function FabVisibilityProvider({ children }: { children: ReactNode }) {
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [hideFAB, setHideFAB] = useState(false);

  // Memoizamos el setter para que los consumidores no re-rendericen
  // cuando cambia cualquier otro valor del provider.
  const setFormFocused = useCallback((focused: boolean) => {
    setIsFormFocused(focused);
  }, []);

  const value = useMemo<FabVisibilityContextValue>(
    () => ({ isFormFocused, hideFAB, setFormFocused, setHideFAB }),
    [isFormFocused, hideFAB, setFormFocused],
  );

  return (
    <FabVisibilityContext.Provider value={value}>
      {children}
    </FabVisibilityContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook de acceso al contexto de visibilidad del FAB.
 * Lanza un error si se usa fuera del `FabVisibilityProvider` para
 * detectar problemas de integración en desarrollo.
 */
export function useFabVisibility(): FabVisibilityContextValue {
  const ctx = useContext(FabVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useFabVisibility debe usarse dentro de <FabVisibilityProvider>",
    );
  }
  return ctx;
}

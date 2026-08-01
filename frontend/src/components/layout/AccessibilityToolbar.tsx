"use client";

import { useEffect, useRef, useState } from "react";
import {useAccessibility} from "@/providers/AccessibilityProvider";
import FontScaleControl from "@/components/ui/FontScaleControl";


interface AccessibilityToolbarProps {
  /** Modo compacto para el Navbar (más pequeño). Por defecto usa botón grande. */
  compact?: boolean;
  /** Si es true, el panel se abre hacia arriba (para botones fixed en la parte inferior). */
  openUp?: boolean;
}

/**
 * Barra de herramientas de accesibilidad.
 * Requisito WCAG 2.1 AA — Discapacidad Visual:
 * - Alternar resolución de interfaz (escala)
 * - Alternar tamaño de fuentes
 * - Activar/desactivar modo Alto Contraste
 * - Etiquetado semántico estricto (aria-label, aria-live)
 */
export default function AccessibilityToolbar({ compact = false, openUp = false }: AccessibilityToolbarProps) {
  const { highContrast, toggleHighContrast, reset } =
    useAccessibility();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        // Devolver foco al botón disparador
        document.getElementById("a11y-toolbar-btn")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón disparador — grande por defecto, compacto en Navbar */}
      <button
        id="a11y-toolbar-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center rounded-2xl font-bold transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70
          ${compact
            ? "w-14 h-14 bg-primary text-on-primary shadow-lg shadow-primary/30 ring-2 ring-primary/30 hover:bg-primary/90"
            : "w-20 h-20 sm:w-[5.25rem] sm:h-[5.25rem] bg-primary text-on-primary shadow-2xl shadow-primary/35 ring-2 ring-primary/40 hover:shadow-[0_30px_60px_-30px_rgba(0,64,161,0.85)] hover:brightness-110"
          }`}
        aria-label="Opciones de accesibilidad"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="a11y-toolbar-panel"
        title="Accesibilidad"
      >
        <span className={`material-symbols-rounded ${compact ? "text-3xl" : "text-5xl sm:text-6xl"}`} aria-hidden="true">
          accessible
        </span>
        {!compact && (
          <span className="sr-only">Accesibilidad</span>
        )}
      </button>

      {/* Panel desplegable */}
      {open && (
        <div
          id="a11y-toolbar-panel"
          role="dialog"
          aria-label="Panel de accesibilidad"
          aria-live="polite"
          className={`absolute right-0 w-72 sm:w-80 rounded-2xl border border-outline-variant/60 bg-surface-container-low shadow-xl shadow-black/10 py-3 z-50 animate-[fadein_120ms_ease-out]
            ${openUp
              ? "bottom-full mb-3"
              : "top-full mt-3"
            }`}
        >
          {/* Encabezado */}
          <div className="px-4 pb-3 border-b border-outline-variant/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-xl text-primary" aria-hidden="true">
                accessible
              </span>
              <h2 className="text-sm font-bold text-on-surface">
                Accesibilidad
              </h2>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              Ajustes de visualización y contraste
            </p>
          </div>

          {/* Opciones */}
          <div className="px-2 py-2 space-y-1">
                     {/* Tamaño de fuente */}
                     <div className="px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-rounded text-lg text-on-surface-variant shrink-0" aria-hidden="true">
                    format_size
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface">
                      Tamaño de fuente
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Control visual
                    </p>
                  </div>
                </div>
                <FontScaleControl />
              </div>
            </div>


            {/* Alto Contraste */}
            <div className="px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-rounded text-lg text-on-surface-variant shrink-0" aria-hidden="true">
                    contrast
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface">
                      Alto Contraste
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {highContrast ? "Activado" : "Desactivado"}
                    </p>
                  </div>
                </div>
                {/* Toggle switch accesible */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={highContrast}
                  aria-label={`Modo de alto contraste: ${highContrast ? "activado" : "desactivado"}. Presiona para alternar.`}
                  onClick={toggleHighContrast}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    highContrast
                      ? "bg-primary"
                      : "bg-surface-container-highest border border-outline"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      highContrast ? "translate-x-6" : "translate-x-1"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Pie: Restaurar */}
          <div className="px-4 pt-2 border-t border-outline-variant/50">
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label="Restaurar configuraciones de accesibilidad a valores por defecto"
            >
              <span className="material-symbols-rounded text-sm" aria-hidden="true">
                restart_alt
              </span>
              Restaurar ajustes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

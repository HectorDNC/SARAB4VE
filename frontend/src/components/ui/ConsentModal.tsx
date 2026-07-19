"use client";

import { useEffect } from "react";

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function ConsentModal({ isOpen, onClose, onAccept }: ConsentModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-rounded text-4xl text-primary">
            privacy_tip
          </span>
          <h2
            id="consent-modal-title"
            className="text-xl font-bold text-on-surface"
          >
            Permiso para grabar
          </h2>
        </div>

        {/* Contenido */}
        <div className="space-y-3 text-on-surface-variant">
          <p className="text-sm leading-relaxed">
            Para usar el reporte de emergencia por voz, necesitamos tu permiso para:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="material-symbols-rounded text-primary text-xl mt-0.5">
                mic
              </span>
              <span>
                <strong className="text-on-surface">Grabar audio:</strong> para capturar tu descripción de la emergencia y opcionalmente enviarla como nota de voz.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-rounded text-primary text-xl mt-0.5">
                location_on
              </span>
              <span>
                <strong className="text-on-surface">Acceder a tu ubicación:</strong> para geolocalizar la emergencia automáticamente en el mapa.
              </span>
            </li>
          </ul>
          <p className="text-xs text-on-surface-variant/80 italic">
            Solo usamos estos datos para procesar tu reporte de emergencia. No se comparten con terceros.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-outline text-on-surface hover:bg-surface-container transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors font-bold"
          >
            Aceptar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}

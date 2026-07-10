"use client";

import { useEffect, useRef, useState } from "react";

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  title?: string;
  content?: React.ReactNode;
}

const DEFAULT_CONTENT = (
  <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
    <h3 className="font-semibold text-on-surface">1. Objeto</h3>
    <p>
      [Placeholder] Este documento establece los términos y condiciones para el uso de la
      plataforma SARA (Sistema de Alertas y Respuesta Asistida), así como el código de
      conducta que deben seguir voluntarios y organizaciones registradas.
    </p>

    <h3 className="font-semibold text-on-surface">2. Responsabilidades del voluntario/organización</h3>
    <p>
      [Placeholder] El usuario se compromete a actuar de buena fe, respetar la privacidad de
      las personas solicitantes, y utilizar la información proporcionada únicamente para fines
      de asistencia humanitaria.
    </p>

    <h3 className="font-semibold text-on-surface">3. Tratamiento de datos personales</h3>
    <p>
      [Placeholder] Los datos proporcionados serán tratados conforme a la normativa vigente de
      protección de datos, y utilizados exclusivamente para coordinar la respuesta ante
      emergencias.
    </p>

    <h3 className="font-semibold text-on-surface">4. Código de conducta</h3>
    <p>
      [Placeholder] Queda prohibido el uso de la plataforma para fines distintos a la asistencia
      humanitaria, así como cualquier forma de discriminación, acoso o negligencia hacia las
      personas solicitantes.
    </p>

    <h3 className="font-semibold text-on-surface">5. Revocación del acceso</h3>
    <p>
      [Placeholder] SARA se reserva el derecho de suspender o revocar el acceso a cualquier
      usuario que incumpla estos términos o el código de conducta.
    </p>

    <p className="italic text-xs pt-2 border-t border-outline-variant">
      Texto Ejemplo
    </p>
  </div>
);

export default function TermsModal({
  open,
  onClose,
  onAccept,
  title = "Términos y código de conducta de SARA",
  content = DEFAULT_CONTENT,
}: TermsModalProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setHasScrolledToEnd(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const reachedEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    if (reachedEnd) {
      setHasScrolledToEnd(true);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col shadow-xl">
        <header className="px-5 sm:px-6 py-4 border-b border-outline-variant shrink-0">
          <h2 id="terms-modal-title" className="text-lg sm:text-xl font-bold text-on-surface">
            {title}
          </h2>
        </header>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-4"
        >
          {content}
        </div>

        <footer className="px-5 sm:px-6 py-4 border-t border-outline-variant shrink-0 flex flex-col gap-2">
          {!hasScrolledToEnd && (
            <p className="text-xs text-on-surface-variant text-center">
              Desplázate hasta el final del texto para poder continuar.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-11 rounded-xl border border-outline font-semibold text-on-surface hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!hasScrolledToEnd}
              className="flex-1 min-h-11 rounded-xl bg-primary text-on-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Acepto
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
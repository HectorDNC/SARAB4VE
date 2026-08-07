"use client";

import { useEffect } from "react";

interface IOSInstallModalProps {
    onClose: () => void;
}

export function IOSInstallModal({ onClose }: IOSInstallModalProps) {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            id="ios-install-modal"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="ios-install-title" className="text-lg font-semibold text-on-surface">
                        Instalar SARA
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                <p className="mb-4 text-sm text-on-surface-variant">
                    En iPhone o iPad, la instalación se hace manualmente desde Safari:
                </p>

                <ol className="space-y-3 text-sm text-on-surface">
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                            1
                        </span>
                        <span>
                            Toca el ícono de <strong>Compartir</strong>{" "}
                            <span className="material-symbols-rounded align-middle text-base" aria-hidden="true">
                                ios_share
                            </span>{" "}
                            en la barra inferior de Safari.
                        </span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                            2
                        </span>
                        <span>
                            Desplázate y selecciona <strong>&quot;Agregar a inicio&quot;</strong>.
                        </span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                            3
                        </span>
                        <span>
                            Toca <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha.
                        </span>
                    </li>
                </ol>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full rounded-full bg-primary py-2 text-sm font-medium text-on-primary"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
}
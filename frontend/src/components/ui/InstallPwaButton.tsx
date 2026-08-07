"use client";

import { useState, useEffect } from "react";
import { useInstallPrompt } from "@/providers/InstallPromptProvider";
import { IOSInstallModal } from "./IOSInstallModal";

interface InstallPwaButtonProps {
    compact?: boolean;
}

export function InstallPwaButton({ compact = false }: InstallPwaButtonProps) {
    const { canPromptInstall, promptInstall, isInstalled, platform } = useInstallPrompt();
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) return null;
    if (isInstalled) return null;
    if (!canPromptInstall && platform !== "ios") return null;

    const isIOS = platform === "ios";

    const handleClick = () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }
        promptInstall();
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-card"
                aria-label="Instalar app"
                title="Instalar app"
                /** Solo en iOS controlamos nosotros un diálogo propio — en Android
                es el navegador el que muestra su propio prompt nativo, fuera
                de nuestro control, así que no anunciamos un estado que no manejamos. **/
                {...(isIOS && {
                    "aria-haspopup": "dialog",
                    "aria-expanded": showIOSInstructions,
                    "aria-controls": "ios-install-modal",
                })}
            >
                <span className="material-symbols-rounded" aria-hidden="true">install_mobile</span>
                {!compact && "Instalar app"}
            </button>

            {showIOSInstructions && (
                <IOSInstallModal onClose={() => setShowIOSInstructions(false)} />
            )}
        </>
    );
}
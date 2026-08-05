"use client";

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from "react";

/**
 * Evento disparado por el navegador cuando la aplicación cumple
 * los requisitos para poder ser instalada como PWA.
 *
 * El evento se almacena para poder mostrar el diálogo de instalación
 * cuando el usuario presione un botón personalizado.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Plataformas soportadas por el proveedor.
 */

type Platform = "android" | "ios" | "desktop" | "unknown";

interface InstallPromptContextValue {
  canPromptInstall: boolean;
  /**
   * Muestra el diálogo nativo de instalación.
   *
   * Retorna:
   * - accepted: el usuario aceptó instalar la aplicación.
   * - dismissed: el usuario canceló la instalación.
   * - unavailable: el navegador no permite mostrar el diálogo.
   */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  isInstalled: boolean;
  platform: Platform;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

/**
 * Determina si la aplicación se está ejecutando como una PWA instalada.
 *
 * Se consideran los diferentes modos definidos por la especificación:
 * - standalone
 * - minimal-ui
 * - fullscreen
 *
 * En Safari para iOS también se verifica navigator.standalone,
 * ya que este navegador no soporta correctamente display-mode.
 */

function getStandaloneSnapshot(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as any).standalone === true
  );
}
function getStandaloneServerSnapshot(): boolean {
  return false;
}
function subscribeStandalone(callback: () => void) {
  const medias = [
    window.matchMedia("(display-mode: standalone)"),
    window.matchMedia("(display-mode: minimal-ui)"),
    window.matchMedia("(display-mode: fullscreen)"),
  ];
  medias.forEach((m) => m.addEventListener("change", callback));
  return () => medias.forEach((m) => m.removeEventListener("change", callback));
}

/**
 * Algunos dispositivos (principalmente ciertos navegadores Android)
 * ejecutan la PWA instalada utilizando display-mode=browser,
 * haciendo que la detección mediante matchMedia falle.
 *
 * Para evitar falsos negativos, el manifest utiliza:
 *
 * start_url: "/?utm_source=pwa"
 *
 * Cuando la aplicación se abre desde el acceso directo instalado,
 * ese parámetro siempre estará presente.
 *
 * En la primera carga se guarda un indicador en sessionStorage
 * para mantener el estado durante toda la navegación.
 */
function checkPwaSession(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("utm_source") === "pwa") {
    sessionStorage.setItem("sara-pwa-session", "true");
    return true;
  }
  return sessionStorage.getItem("sara-pwa-session") === "true";
}

/**
 * Detecta la plataforma utilizando el User Agent.
 *
 * Se utiliza únicamente para adaptar el comportamiento o la UI
 * según el sistema operativo.
 */

function getPlatformSnapshot(): Platform {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}
function getPlatformServerSnapshot(): Platform {
  return "unknown";
}
function subscribeNoop() {
  return () => { };
}

/**
 * Provider global encargado de gestionar toda la lógica relacionada
 * con la instalación de la PWA.
 *
 * Se recomienda montarlo una sola vez desde el Layout principal para:
 *
 * - Capturar el evento beforeinstallprompt.
 * - Mantener disponible el diálogo de instalación.
 * - Compartir el estado entre todos los componentes.
 */
export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  /**
   * Detecta si la aplicación se encuentra ejecutándose como instalada
   * utilizando los display-modes soportados por el navegador.
   */
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getStandaloneServerSnapshot);

  const [isPwaSession, setIsPwaSession] = useState(false);

  const platform = useSyncExternalStore(subscribeNoop, getPlatformSnapshot, getPlatformServerSnapshot);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsPwaSession(checkPwaSession());

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  const isInstalled = isStandalone || isPwaSession;

  return (
    <InstallPromptContext.Provider
      value={{ canPromptInstall: deferredPrompt !== null && !isInstalled, promptInstall, isInstalled, platform }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error("useInstallPrompt debe usarse dentro de <InstallPromptProvider>");
  }
  return ctx;
}
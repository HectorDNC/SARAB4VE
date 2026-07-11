"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Tipos ──────────────────────────────────────────────────────────────────

export type LocationStatus = "idle" | "loading" | "ready" | "error" | "denied";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface LocationContextValue {
  /** Coordenadas actuales (null si aún no están disponibles). */
  location: UserLocation | null;
  /** Estado de la solicitud de geolocalización. */
  status: LocationStatus;
  /** Mensaje de error (vacío si no hay error). */
  error: string;
  /** Vuelve a pedir la ubicación manualmente. */
  requestLocation: () => void;
}

// ── Contexto ───────────────────────────────────────────────────────────────

export const LocationContext = createContext<LocationContextValue>({
  location: null,
  status: "idle",
  error: "",
  requestLocation: () => {},
});

// ── Provider ────────────────────────────────────────────────────────────────

export default function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [error, setError] = useState("");
  const requestedRef = useRef(false);

  const requestLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setStatus("error");
      setError("Tu dispositivo no permite geolocalización.");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus("ready");
        setError("");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError(
            "Permiso de ubicación denegado. Puedes activarlo desde la configuración del navegador.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus("error");
          setError("No se pudo obtener la ubicación. Verifica tu conexión.");
        } else if (err.code === err.TIMEOUT) {
          setStatus("error");
          setError("La solicitud de ubicación tardó demasiado. Intenta de nuevo.");
        } else {
          setStatus("error");
          setError("Error desconocido al obtener la ubicación.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (!requestedRef.current) {
      requestedRef.current = true;
      requestLocation();
    }
  }, [requestLocation]);

  return (
    <LocationContext.Provider
      value={{ location, status, error, requestLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

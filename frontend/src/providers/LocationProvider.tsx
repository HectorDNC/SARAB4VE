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
  /**
   * Vuelve a pedir la ubicación manualmente.
   * Retorna una promesa que resuelve con las coordenadas o rechaza con el error
   * (incluye el caso de permiso denegado). Permite reintentar la geolocalización
   * justo en el momento de confirmar acciones críticas (ej. envío de emergencias).
   */
  requestLocation: () => Promise<UserLocation>;
}

// ── Contexto ───────────────────────────────────────────────────────────────

export const LocationContext = createContext<LocationContextValue>({
  location: null,
  status: "idle",
  error: "",
  requestLocation: () => Promise.reject(new Error("LocationProvider no inicializado")),
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

  const requestLocation = useCallback((): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        setStatus("error");
        setError("Tu dispositivo no permite geolocalización.");
        reject(new Error("Geolocalización no soportada"));
        return;
      }

      setStatus("loading");
      setError("");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          setStatus("ready");
          setError("");
          resolve(coords);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setStatus("denied");
            setError(
              "Permiso de ubicación denegado. Puedes activarlo desde la configuración del navegador.",
            );
            reject(new Error("Permiso de ubicación denegado"));
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setStatus("error");
            setError("No se pudo obtener la ubicación. Verifica tu conexión.");
            reject(new Error("Ubicación no disponible"));
          } else if (err.code === err.TIMEOUT) {
            setStatus("error");
            setError("La solicitud de ubicación tardó demasiado. Intenta de nuevo.");
            reject(new Error("Tiempo de espera agotado"));
          } else {
            setStatus("error");
            setError("Error desconocido al obtener la ubicación.");
            reject(new Error("Error desconocido al obtener la ubicación"));
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
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

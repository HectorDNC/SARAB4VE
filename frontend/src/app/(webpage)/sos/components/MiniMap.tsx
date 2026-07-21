"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  label?: string;
}

/**
 * Mini mapa estático de solo lectura que muestra un punto
 * en la ubicación detectada del usuario.
 * Requisito 2.1: "mapa en miniatura con el punto exacto detectado".
 */
export default function MiniMap({ latitude, longitude, label = "Tu ubicación" }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Solo inicializar una vez
    if (mapRef.current) {
      // Actualizar vista y marcador
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom() || 15);
      markerRef.current?.setLatLng([latitude, longitude]);
      return;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    }).setView([latitude, longitude], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Marcador de ubicación del usuario (pulso animado)
    const pulseIcon = L.divIcon({
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:-6px;border-radius:50%;
            background:rgba(0,64,161,0.25);animation:mini-pulse 1.8s infinite;
          "></div>
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:#0040a1;border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
          "></div>
        </div>
        <style>
          @keyframes mini-pulse {
            0% { transform:scale(1);opacity:1; }
            100% { transform:scale(2.5);opacity:0; }
          }
        </style>
      `,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(map);
    marker.bindTooltip(label, {
      permanent: true,
      direction: "top",
      offset: [0, -12],
      className: "mini-map-tooltip",
    });

    markerRef.current = marker;
    mapRef.current = map;

    // Forzar resize cuando el contenedor se haga visible
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, label]);

  return (
    <div
      ref={containerRef}
      className="w-full h-36 sm:h-44 rounded-2xl border-2 border-outline-variant overflow-hidden bg-surface-container-low"
      aria-label={`Mapa con ${label}`}
    />
  );
}

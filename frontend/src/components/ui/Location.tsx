"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Icon } from "leaflet";
import { useLocation } from "@/hooks/useLocation";

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number }) => void;
}

const FALLBACK_CENTER: [number, number] = [-12.0464, -77.0428];

function ClickHandler({ onChange }: { onChange: LocationPickerProps["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function Location({ value, onChange }: LocationPickerProps) {
  const { location: userLocation, status: globalStatus } = useLocation();
  const [markerIcon, setMarkerIcon] = useState<Icon | null>(null);

  // Centrar el mapa en la ubicación del usuario si está disponible
  const autoCenter: [number, number] = useMemo(() => {
    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }
    return FALLBACK_CENTER;
  }, [userLocation]);

  useEffect(() => {
    import("leaflet").then((L) => {
      const icon = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      setMarkerIcon(icon);
    });
  }, []);

  const mapCenter: [number, number] = value ? [value.lat, value.lng] : autoCenter;

  if (!markerIcon) {
    return <div className="h-[300px] rounded-xl bg-surface-container animate-pulse" />;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-outline-variant relative z-10">
      <MapContainer center={mapCenter} zoom={13} style={{ height: "300px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onChange={onChange} />
        {!value && globalStatus === "ready" && <RecenterMap center={autoCenter} />}
        {value && <Marker position={[value.lat, value.lng]} icon={markerIcon} />}
      </MapContainer>

      <div className="text-xs px-3 py-2 bg-surface-container-low space-y-1">
        {globalStatus === "loading" && <p className="text-on-surface-variant">Buscando tu ubicación actual...</p>}
        {globalStatus === "denied" && (
          <p className="text-on-surface-variant">No activaste tu ubicación. Puedes marcar manualmente en el mapa.</p>
        )}
        {globalStatus === "error" && (
          <p className="text-on-surface-variant">No pudimos detectar tu ubicación. Marca manualmente en el mapa.</p>
        )}
        {value ? (
          <p className="text-on-surface-variant">
            Ubicación seleccionada: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-on-surface-variant">Haz clic en el mapa para confirmar tu ubicación.</p>
        )}
      </div>
    </div>
  );
}
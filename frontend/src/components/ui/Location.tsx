"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Icon } from "leaflet";
import { alertService } from "@/services/alertService";

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange?: (location: { lat: number; lng: number }) => void;
  readOnly?: boolean;
}

function ClickHandler({ onChange, readOnly, }: {
  onChange?: (location: { lat: number; lng: number }) => void;
  readOnly: boolean;
}) {
 useMapEvents({
    click(e) {
      if (readOnly) {
        alertService.info("Este mapa es solo informativo. La ubicación no se puede modificar aquí.");
        return;
      }
      onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}
type GeoStatus = "loading" | "ready" | "error" | "denied";


export default function Location({ value, onChange, readOnly = false }: LocationPickerProps) {
  const [autoCenter, setAutoCenter] = useState<[number, number]>([-12.0464, -77.0428]);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("loading");
  const [markerIcon, setMarkerIcon] = useState<Icon | null>(null);

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

  useEffect(() => {
    if (readOnly) return;

    if (!navigator?.geolocation) {
      setGeoStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAutoCenter([position.coords.latitude, position.coords.longitude]);
        setGeoStatus("ready");
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
    );
  }, [readOnly]);

  const mapCenter: [number, number] = value ? [value.lat, value.lng] : autoCenter;

  if (!markerIcon) {
    return <div className="h-[300px] rounded-xl bg-surface-container animate-pulse" />;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-outline-variant relative z-10">
      <MapContainer center={mapCenter} zoom={13} style={{ height: "300px", width: "100%" }} dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomControl={true}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onChange={onChange} readOnly={readOnly} />
        {value && <Marker position={[value.lat, value.lng]} icon={markerIcon} />}
      </MapContainer>

      {!readOnly && (
        <div className="text-xs px-3 py-2 bg-surface-container-low space-y-1">
          {geoStatus === "loading" && <p className="text-on-surface-variant">Buscando tu ubicación actual...</p>}
          {geoStatus === "denied" && (
            <p className="text-on-surface-variant">No activaste tu ubicación. Puedes marcar manualmente en el mapa.</p>
          )}
          {value ? (
            <p className="text-on-surface-variant">
              Ubicación seleccionada: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </p>
          ) : (
            <p className="text-on-surface-variant">Haz clic en el mapa para confirmar tu ubicación.</p>
          )}
        </div>
      )}
    </div>
  );
}



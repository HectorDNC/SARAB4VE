"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapItem, UrgencyLevel } from "@/types";
import { Refugios, CONFIGURACION_SERVICIOS } from "@/mocks/refugios";
import { TarjetaRefugio } from "@/app/(webpage)/mapa/TarjetaRefugio";
import { TarjetaEmergencia } from "@/app/(webpage)/mapa/TarjetaEmergencia";
import { TarjetaSolicitud } from "@/app/(webpage)/mapa/TarjetaSolicitud";
import { EstadoVacio } from "@/app/(webpage)/mapa/EstadoVacio";
import { ModalDetalleSolicitud } from "@/app/(webpage)/mapa/ModalDetalleSolicitud";
import { listEmergencies, EmergencyListItem } from "@/api/emergencies";
import { listHelpRequests, HelpRequestListItem } from "@/api/helpRequests";
import { useLocation } from "@/hooks/useLocation";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
      <div className="flex flex-col items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-rounded text-4xl animate-pulse" aria-hidden="true">
          map
        </span>
        <p className="text-sm font-medium">Cargando mapa…</p>
      </div>
    </div>
  ),
});

// ── Helpers de mapeo ────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function emergencyToMapItem(e: EmergencyListItem): MapItem {
  return {
    kind: "emergency",
    id: e.id,
    lat: e.latitude,
    lng: e.longitude,
    urgency: e.urgency,
    status: e.status,
    createdAt: e.createdAt,
    requesterName: e.requesterName,
    disabilityType: e.disabilityType as MapItem["disabilityType"],
    disabilitySubcategory: e.disabilitySubcategory ?? undefined,
    communicationMode: e.communicationMode,
    needType: e.needType,
    description: e.description,
    isInjured: e.isInjured,
    cannotMove: e.cannotMove,
    extraInfo: e.extraInfo,
    voiceNoteUrl: e.voiceNoteUrl,
    voiceNoteDurationSec: e.voiceNoteDurationSec,
    assignedAt: e.assignedAt,
    resolvedAt: e.resolvedAt,
    updatedAt: e.updatedAt,
    distanceKm: e.distanceKm,
  };
}

function helpRequestToMapItem(h: HelpRequestListItem): MapItem | null {
  // Sin coordenadas no se puede pintar en el mapa
  if (h.latitude == null || h.longitude == null) return null;

  return {
    kind: "help_request",
    id: h.id,
    lat: h.latitude,
    lng: h.longitude,
    urgency: h.urgency,
    status: h.status,
    createdAt: h.createdAt,
    requesterName: h.requesterName,
    needType: h.needType,
    description: h.description,
    contactMethod: h.contactMethod,
    contactValue: h.contactValue,
    volunteerName: h.volunteerName,
    volunteerContactMethod: h.volunteerContactMethod,
    volunteerContactValue: h.volunteerContactValue,
    assignedAt: h.assignedAt,
    resolvedAt: h.resolvedAt,
    updatedAt: h.updatedAt,
    distanceKm: h.distanceKm,
  };
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function MapaPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // ── Modal de detalles ──
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalKind, setModalKind] = useState<"emergency" | "help_request" | null>(null);

  // ── Datos de la API ──
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Filtros ──
  const [kindFilter, setKindFilter] = useState<"all" | "emergency" | "help_request">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "assigned" | "resolved" | "all">("active");

  // ── Ubicación del usuario ──
  const { location: userLocation } = useLocation();

  const handleRefreshMap = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Mapear filtro de estado a los valores de API para cada tipo
        const emergencyStatuses: Record<string, string[]> = {
          active: ["received"],
          assigned: ["assigned"],
          resolved: ["resolved"],
          all: ["received", "assigned", "resolved"],
        };
        const helpRequestStatuses: Record<string, string[]> = {
          active: ["open"],
          assigned: ["assigned"],
          resolved: ["resolved"],
          all: ["open", "assigned", "resolved"],
        };

        const emergenciesPromise =
          kindFilter === "help_request"
            ? Promise.resolve([] as EmergencyListItem[])
            : listEmergencies({ status: emergencyStatuses[statusFilter] });

        const helpRequestsPromise =
          kindFilter === "emergency"
            ? Promise.resolve([] as HelpRequestListItem[])
            : listHelpRequests({ status: helpRequestStatuses[statusFilter] });

        const [emergencies, helpRequests] = await Promise.all([
          emergenciesPromise,
          helpRequestsPromise,
        ]);

        if (cancelled) return;

        // Convertir a MapItem[]
        const emergencyItems: MapItem[] = emergencies.map(emergencyToMapItem);
        const helpRequestItems: MapItem[] = helpRequests
          .map(helpRequestToMapItem)
          .filter((item): item is MapItem => item !== null);

        // Merge: emergencias primero, ordenadas por urgencia, luego solicitudes
        const sorted: MapItem[] = [
          ...emergencyItems.sort(
            (a, b) =>
              URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
          ...helpRequestItems.sort(
            (a, b) =>
              URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        ];

        setMapItems(sorted);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar datos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, kindFilter, statusFilter]);

  // Filtrar refugios (mock) — solo visibles cuando no hay filtro de tipo activo o es "all"
  const refugiosFiltrados =
    kindFilter !== "all"
      ? []
      : Refugios.filter((s) => {
          const coincideBusqueda =
            query.trim() === "" ||
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.sector.toLowerCase().includes(query.toLowerCase()) ||
            s.address.toLowerCase().includes(query.toLowerCase());
          return coincideBusqueda;
        });

  // Filtrar mapItems (emergencias + solicitudes) por búsqueda de texto
  const mapItemsFiltrados = mapItems.filter((item) => {
    if (query.trim() === "") return true;
    const q = query.toLowerCase();
    return (
      (item.requesterName ?? "").toLowerCase().includes(q) ||
      (item.needType ?? "").toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q) ||
      (item.disabilityType ?? "").toLowerCase().includes(q)
    );
  });

  const totalResultados = mapItemsFiltrados.length + refugiosFiltrados.length;

  // ── Elemento seleccionado ──────────────────────────────────────────────

  const selectedItem = selectedId
    ? mapItems.find((m) => m.id === selectedId) ?? null
    : null;
  const selectedShelter = selectedId
    ? Refugios.find((r) => r.id === selectedId) ?? null
    : null;

  const handleSeleccionar = (id: string | null) => {
    setSelectedId((prev) => (prev === id ? null : id));
    if (id) setMobileDrawerOpen(false);
  };

  const handleViewDetails = (item: MapItem) => {
    setModalId(item.id);
    setModalKind(item.kind === "emergency" ? "emergency" : "help_request");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background relative">
      {/* ══════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside
        className={`hidden lg:flex flex-col bg-surface border-r border-outline-variant transition-all duration-200 shrink-0 ${
          sidebarOpen ? "w-80 xl:w-96" : "w-14"
        } overflow-hidden`}
        aria-label="Panel de refugios"
      >
        {/* Cabecera */}
        <div className={`pt-4 pb-3 border-b border-outline-variant ${sidebarOpen ? "px-4" : "px-2"}`}>
          <div
            className={`flex items-center ${
              sidebarOpen ? "justify-between mb-1" : "justify-center mb-1"
            }`}
          >
            {sidebarOpen ? (
              <h1 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">
                  emergency_home
                </span>
                Solicitudes Cercana
              </h1>
            ) : null}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? "Ocultar panel" : "Mostrar panel"}
              className="flex w-8 h-8 items-center justify-center rounded-lg hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-rounded text-base text-on-surface-variant" aria-hidden="true">
                {sidebarOpen ? "chevron_left" : "chevron_right"}
              </span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            {sidebarOpen ? (
              <>
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-on-surface-variant text-lg pointer-events-none"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o necesidad…"
                  aria-label="Buscar"
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-container rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <span className="material-symbols-rounded text-base text-on-surface-variant hover:text-on-surface" aria-hidden="true">
                      close
                    </span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir búsqueda"
                className="flex w-8 h-8 items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors mx-auto mt-2"
              >
                <span className="material-symbols-rounded text-lg">search</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros compactos (select) */}
        {sidebarOpen && (
          <div className="px-4 py-2 border-b border-outline-variant flex gap-2">
            <div className="relative flex-1">
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
                aria-label="Tipo de solicitud"
                className="w-full appearance-none bg-surface-container text-on-surface text-[11px] font-bold pl-2.5 pr-7 py-1.5 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Todas</option>
                <option value="emergency">Emergencias</option>
                <option value="help_request">Apoyo</option>
              </select>
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-sm text-on-surface-variant">
                unfold_more
              </span>
            </div>
            <div className="relative flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="Estado"
                className="w-full appearance-none bg-surface-container text-on-surface text-[11px] font-bold pl-2.5 pr-7 py-1.5 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Todas</option>
                <option value="active">Activas</option>
                <option value="assigned">Asignadas</option>
                <option value="resolved">Resueltas</option>
              </select>
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-sm text-on-surface-variant">
                unfold_more
              </span>
            </div>
          </div>
        )}

        {/* Lista de resultados */}
        {sidebarOpen ? (
          <div
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
            role="list"
            aria-label="Lista de ayuda"
            aria-live="polite"
          >
            {/* Spinner */}
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="material-symbols-rounded text-3xl text-red-500">error</span>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Detalle de seleccionado */}
            {!loading && selectedId && (selectedItem || selectedShelter) ? (
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-2 text-primary font-bold text-xs hover:opacity-80 transition-opacity self-start py-1 px-2 rounded-lg bg-primary/5 min-h-0"
                >
                  <span className="material-symbols-rounded text-sm">arrow_back</span>
                  Volver a la lista
                </button>

                {selectedItem ? (
                  selectedItem.kind === "emergency" ? (
                    <TarjetaDetalleEmergencia item={selectedItem} onViewDetails={handleViewDetails} />
                  ) : (
                    <TarjetaDetalleSolicitud item={selectedItem} onViewDetails={handleViewDetails} />
                  )
                ) : selectedShelter ? (
                  <TarjetaDetalleRefugio refugio={selectedShelter} />
                ) : null}
              </div>
            ) : !loading && totalResultados === 0 ? (
              <EstadoVacio
                query={query}
                filtrosActivos={new Set()}
                onLimpiar={() => {
                  setQuery("");
                }}
              />
            ) : !loading ? (
              <>
                <p className="text-xs text-on-surface-variant px-1 mb-1">
                  <strong className="text-on-surface">{totalResultados}</strong> resultado
                  {totalResultados !== 1 ? "s" : ""}
                </p>

                {/* ── Emergencias (prioridad) ── */}
                {mapItemsFiltrados
                  .filter((m) => m.kind === "emergency")
                  .map((item) => (
                    <div key={item.id} role="listitem">
                      <TarjetaEmergencia
                        item={item}
                        isSelected={selectedId === item.id}
                        onClick={() => handleSeleccionar(item.id)}
                      />
                    </div>
                  ))}

                {/* ── Solicitudes de ayuda ── */}
                {mapItemsFiltrados
                  .filter((m) => m.kind === "help_request")
                  .map((item) => (
                    <div key={item.id} role="listitem">
                      <TarjetaSolicitud
                        item={item}
                        isSelected={selectedId === item.id}
                        onClick={() => handleSeleccionar(item.id)}
                      />
                    </div>
                  ))}

                {/* ── Refugios (mock) ── */}
                {refugiosFiltrados.map((s) => (
                  <div key={s.id} role="listitem">
                    <TarjetaRefugio
                      shelter={s}
                      isSelected={selectedId === s.id}
                      onClick={() => handleSeleccionar(s.id)}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </aside>

      {/* ══════════════════════════════════════════════════
          MAPA
      ══════════════════════════════════════════════════ */}
      <div className="flex-1 relative">
        <LeafletMap
          shelters={refugiosFiltrados}
          selectedId={selectedId}
          onSelect={handleSeleccionar}
          mapItems={mapItemsFiltrados}
          initialCenter={
            userLocation
              ? ([userLocation.latitude, userLocation.longitude] as [number, number])
              : null
          }
        />

        {/* ── MOBILE: Buscador flotante ── */}
        <div className="lg:hidden absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2">
          <button
            onClick={() => setMobileDrawerOpen((v) => !v)}
            aria-label={mobileDrawerOpen ? "Cerrar panel" : "Abrir panel"}
            className="flex w-11 h-11 items-center justify-center bg-white border border-outline-variant rounded-xl shadow-md hover:bg-surface-container transition-colors shrink-0"
          >
            <span className="material-symbols-rounded text-xl text-on-surface">
              {mobileDrawerOpen ? "close" : "menu"}
            </span>
          </button>

          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-on-surface-variant text-lg pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              aria-label="Buscar"
              className="w-full pl-9 pr-9 py-2.5 bg-white rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant shadow-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <span className="material-symbols-rounded text-base text-on-surface-variant hover:text-on-surface" aria-hidden="true">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── MOBILE: Drawer lateral ── */}
        {mobileDrawerOpen && (
          <div
            className="lg:hidden absolute inset-0 z-[1500] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        <div
          className={`lg:hidden absolute top-0 left-0 bottom-0 z-[1600] flex flex-col bg-surface shadow-2xl transition-all duration-300 ease-in-out ${
            mobileDrawerOpen ? "w-[85vw] max-w-sm" : "w-0"
          } overflow-hidden`}
          aria-label="Panel (móvil)"
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-outline-variant shrink-0">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">
                emergency_home
              </span>
              Solicitudes Cercana
            </h2>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Cerrar panel"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-rounded text-base text-on-surface-variant">chevron_left</span>
            </button>
          </div>

          {/* Filtros compactos (móvil) */}
          <div className="px-4 py-2 border-b border-outline-variant flex gap-2">
            <div className="relative flex-1">
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
                aria-label="Tipo de solicitud"
                className="w-full appearance-none bg-surface-container text-on-surface text-[11px] font-bold pl-2.5 pr-7 py-1.5 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Todas</option>
                <option value="emergency">Emergencias</option>
                <option value="help_request">Apoyo</option>
              </select>
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-sm text-on-surface-variant">
                unfold_more
              </span>
            </div>
            <div className="relative flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="Estado"
                className="w-full appearance-none bg-surface-container text-on-surface text-[11px] font-bold pl-2.5 pr-7 py-1.5 rounded-lg border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Todas</option>
                <option value="active">Activas</option>
                <option value="assigned">Asignadas</option>
                <option value="resolved">Resueltas</option>
              </select>
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-sm text-on-surface-variant">
                unfold_more
              </span>
            </div>
          </div>

          {/* Lista */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
            role="list"
            aria-label="Lista de ayuda"
            aria-live="polite"
          >
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="material-symbols-rounded text-3xl text-red-500">error</span>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {!loading && totalResultados === 0 ? (
              <EstadoVacio
                query={query}
                filtrosActivos={new Set()}
                onLimpiar={() => {
                  setQuery("");
                }}
              />
            ) : !loading ? (
              <>
                <p className="text-xs text-on-surface-variant px-1 mb-1">
                  <strong className="text-on-surface">{totalResultados}</strong> resultado
                  {totalResultados !== 1 ? "s" : ""}
                </p>
                {mapItemsFiltrados
                  .filter((m) => m.kind === "emergency")
                  .map((item) => (
                    <div key={item.id} role="listitem">
                      <TarjetaEmergencia
                        item={item}
                        isSelected={selectedId === item.id}
                        onClick={() => handleSeleccionar(item.id)}
                      />
                    </div>
                  ))}
                {mapItemsFiltrados
                  .filter((m) => m.kind === "help_request")
                  .map((item) => (
                    <div key={item.id} role="listitem">
                      <TarjetaSolicitud
                        item={item}
                        isSelected={selectedId === item.id}
                        onClick={() => handleSeleccionar(item.id)}
                      />
                    </div>
                  ))}
                {refugiosFiltrados.map((s) => (
                  <div key={s.id} role="listitem">
                    <TarjetaRefugio
                      shelter={s}
                      isSelected={selectedId === s.id}
                      onClick={() => handleSeleccionar(s.id)}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>

        {/* ── MOBILE: Bottom sheet detalle ── */}
        {selectedId && (selectedItem || selectedShelter) && (
          <div className="lg:hidden absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
            <div className="bg-surface rounded-t-3xl shadow-2xl border-t border-outline-variant overflow-hidden">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-outline-variant"></div>
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-1.5 text-primary font-bold text-xs hover:opacity-80 transition-opacity py-1 min-h-0"
                >
                  <span className="material-symbols-rounded text-sm">arrow_back</span>
                  Volver
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                  aria-label="Cerrar detalle"
                >
                  <span className="material-symbols-rounded text-base text-on-surface-variant">close</span>
                </button>
              </div>
              <div className="px-4 pb-6 max-h-[50vh] overflow-y-auto">
                {selectedItem ? (
                  selectedItem.kind === "emergency" ? (
                    <TarjetaDetalleEmergencia item={selectedItem} onViewDetails={handleViewDetails} />
                  ) : (
                    <TarjetaDetalleSolicitud item={selectedItem} onViewDetails={handleViewDetails} />
                  )
                ) : selectedShelter ? (
                  <TarjetaDetalleRefugio refugio={selectedShelter} />
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ── Banner de seguridad ── */}
        {showBanner && !selectedId && (
          <div className="absolute bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[900] w-[90%] sm:w-[480px] bg-[#1c1b1b] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg border border-neutral-800">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-rounded text-lg text-amber-500 shrink-0 mt-0.5" aria-hidden="true">
                warning
              </span>
              <p className="text-xs font-medium leading-normal text-gray-200">
                Zona de seguridad actualizada hace 2 minutos. Todos los refugios listados tienen suministro eléctrico.
              </p>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Cerrar notificación"
            >
              <span className="material-symbols-rounded text-base" aria-hidden="true">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Animación slide-up */}
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── Modal de detalles ── */}
      <ModalDetalleSolicitud
        id={modalId}
        kind={modalKind}
        open={modalId !== null}
        onClose={() => { setModalId(null); setModalKind(null); }}
        onAttendSuccess={handleRefreshMap}
      />
    </div>
  );
}

// ── Componentes de detalle ──────────────────────────────────────────────────

const URGENCY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const DISABILITY_LABELS: Record<string, string> = {
  visual: "Visual",
  auditiva: "Auditiva",
  neuro: "Neurodivergente",
  motriz: "Motriz",
};

const NEED_TYPE_LABELS: Record<string, string> = {
  equipment: "Equipamiento",
  medication: "Medicación",
  transport: "Transporte",
  companionship: "Acompañamiento",
  interpreter: "Intérprete",
  accessible_information: "Información accesible",
  neurodivergent_support: "Apoyo neurodivergente",
  psychosocial_support: "Apoyo psicosocial",
};

function TarjetaDetalleEmergencia({ item, onViewDetails }: { item: MapItem; onViewDetails?: (item: MapItem) => void }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-card">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface leading-tight">
              {item.requesterName ?? "Persona en emergencia"}
            </h2>
            <span
              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                item.urgency === "critical"
                  ? "bg-red-100 text-red-700"
                  : item.urgency === "high"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              Urgencia {URGENCY_LABELS[item.urgency] ?? item.urgency}
            </span>
          </div>
          <span className="material-symbols-rounded text-3xl text-red-500">emergency</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {item.disabilityType && (
            <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-full">
              {DISABILITY_LABELS[item.disabilityType] ?? item.disabilityType}
            </span>
          )}
          {item.needType && (
            <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-full">
              {NEED_TYPE_LABELS[item.needType] ?? item.needType}
            </span>
          )}
          {item.isInjured && (
            <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-rounded text-[12px]">personal_injury</span>
              Herido
            </span>
          )}
          {item.cannotMove && (
            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-rounded text-[12px]">wheelchair_pickup</span>
              No puede moverse
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
        )}

        {item.extraInfo && (
          <div className="bg-surface-container p-3 rounded-xl">
            <p className="text-xs font-semibold text-on-surface mb-1">Información adicional</p>
            <p className="text-xs text-on-surface-variant">{item.extraInfo}</p>
          </div>
        )}

        {/* Botones */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <a
            href={`https://www.openstreetmap.org/directions?from=&to=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors"
          >
            <span className="material-symbols-rounded text-lg">directions</span>
            Cómo llegar
          </a>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(item)}
              className="flex items-center justify-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-xl py-2.5 text-sm font-bold transition-colors"
            >
              <span className="material-symbols-rounded text-lg">info</span>
              Ver detalles
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TarjetaDetalleSolicitud({ item, onViewDetails }: { item: MapItem; onViewDetails?: (item: MapItem) => void }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-card">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface leading-tight">
              {item.requesterName ?? "Solicitante anónimo"}
            </h2>
            <span
              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                item.urgency === "critical"
                  ? "bg-orange-100 text-orange-700"
                  : item.urgency === "high"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              Urgencia {URGENCY_LABELS[item.urgency] ?? item.urgency}
            </span>
          </div>
          <span className="material-symbols-rounded text-3xl text-[#0040a1]">handshake</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.needType && (
            <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-full">
              {NEED_TYPE_LABELS[item.needType] ?? item.needType}
            </span>
          )}
          {item.volunteerName && (
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-rounded text-[12px]">volunteer_activism</span>
              {item.volunteerName}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
        )}

        {item.contactValue && (
          <div className="bg-surface-container p-3 rounded-xl">
            <p className="text-xs font-semibold text-on-surface mb-1">Contacto</p>
            <p className="text-xs text-on-surface-variant">
              {item.contactMethod}: {item.contactValue}
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <a
            href={`https://www.openstreetmap.org/directions?from=&to=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#0040a1] hover:bg-[#0056d2] text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors"
          >
            <span className="material-symbols-rounded text-lg">directions</span>
            Cómo llegar
          </a>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(item)}
              className="flex items-center justify-center gap-2 border border-[#0040a1]/30 text-[#0040a1] hover:bg-blue-50 rounded-xl py-2.5 text-sm font-bold transition-colors"
            >
              <span className="material-symbols-rounded text-lg">info</span>
              Ver detalles
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TarjetaDetalleRefugio({ refugio }: { refugio: (typeof Refugios)[number] }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-card">
      <div className="relative h-40 w-full bg-surface-container-high">
        <img
          src={refugio.imagen || "/logo.webp"}
          alt={refugio.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/logo.webp";
          }}
        />
        {refugio.status === "activo" && (
          <div className="absolute top-3 right-3 bg-[#fc6018] text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Activo
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-on-surface leading-tight">{refugio.name}</h2>
          <div className="flex items-center gap-1 mt-1.5 text-on-surface-variant">
            <span className="material-symbols-rounded text-sm shrink-0">location_on</span>
            <span className="text-xs font-semibold">{refugio.address}</span>
          </div>
        </div>
        {refugio.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {refugio.services.map((svc) => (
              <span
                key={svc}
                className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <span className="material-symbols-rounded text-[12px]">
                  {svc === "wifi" ? "wifi" : svc === "salud" ? "medical_services" : "restaurant"}
                </span>
                {CONFIGURACION_SERVICIOS[svc]}
              </span>
            ))}
          </div>
        )}
        <a
          href={`https://www.openstreetmap.org/directions?from=&to=${refugio.lat},${refugio.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#0040a1] hover:bg-[#0056d2] text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors mt-2"
        >
          <span className="material-symbols-rounded text-lg">directions</span>
          Cómo llegar ahora
        </a>
      </div>
    </div>
  );
}
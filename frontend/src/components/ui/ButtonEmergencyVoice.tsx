"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useLocation } from "@/hooks/useLocation";
import ConsentModal from "./ConsentModal";
import { sendEmergencyVoice, getEmergencyById, type VoiceEmergencyResponse } from "@/api/emergencies";
import { alertService } from "@/services/alertService";
import { useEmergencyProcessing, type ProcessingUpdate } from "@/hooks/useEmergencyProcessing";
import { useFabVisibility } from "@/providers/FabVisibilityProvider";
import {
  voiceRecorderClearPending,
  voiceRecorderSetPhase,
  subscribeVoiceRecorder,
  getVoiceRecorderSnapshot,
} from "@/providers/VoiceRecorderStore";

type ButtonState = "idle" | "listening" | "processing" | "success";

/**
 * Tamaño y opacidad del FAB cuando el usuario está escribiendo en un
 * formulario (estado reducido). Mantener 32px y 0.4 para que el botón
 * sea visible pero claramente subordinado y no oculte el campo activo.
 */
const FAB_MINIMIZED_SIZE_PX = 45;
const FAB_MINIMIZED_OPACITY = 0.6;
const FAB_FULL_SIZE_CLASS = "px-5 py-4";

/**
 * Cuando el FAB está minimizado y el usuario inicia una grabación,
 * crece hasta 48px y recupera opacidad plena. El objetivo es que el
 * toque para detener la grabación sea cómodo (target ≥ 44px según
 * WCAG 2.5.5) sin volver al tamaño completo que oculta el formulario.
 */
const FAB_MINIMIZED_RECORDING_SIZE_PX = 50;

/** Datos recolectados listos para revisión antes de enviar al backend. */
interface VoicePreview {
  transcript: string;
  latitude: number;
  longitude: number;
  durationSec: number;
}

export default function ButtonEmergencyVoice() {
  const [state, setState] = useState<ButtonState>("idle");
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Reintento de geolocalización al confirmar el envío
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [freshCoords, setFreshCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  // Respuesta del backend tras enviar — para mostrar pantalla de éxito con clasificación
  const [serverResponse, setServerResponse] = useState<VoiceEmergencyResponse | null>(null);
  // Emergency ID para suscribirse a WebSocket
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(null);
  // Actualizaciones de procesamiento en tiempo real
  const [processingUpdates, setProcessingUpdates] = useState<ProcessingUpdate[]>([]);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const recordingStartRef = useRef<number>(0);
  // Refs espejo para leer valores actuales dentro del callback del timer
  const activeEmergencyIdRef = useRef<string | null>(null);
  const serverResponseRef = useRef<VoiceEmergencyResponse | null>(null);

  // Programa un re-fetch de la emergencia tras 10s para refrescar la data
  // cuando el WebSocket falla o se desconecta.
  const scheduleFallbackFetch = useCallback(async () => {
    const eid = activeEmergencyIdRef.current;
    if (!eid) return;
    try {
      const fresh = await getEmergencyById(eid);
      const current = serverResponseRef.current;
      if (!current) return;

      // Mapear campos del GET /api/emergencies/:id al VoiceEmergencyResponse local
      // - urgency (critical/high/medium/low) → severidad (alta/media/baja/null)
      // - needType → tipo
      // - status / processingStatus → indica si la emergencia ya fue procesada
      const urgenciaASeveridad = (urgency: string): "alta" | "media" | "baja" | null => {
        switch (urgency) {
          case "critical":
          case "high":
            return "alta";
          case "medium":
            return "media";
          case "low":
            return "baja";
          default:
            return null;
        }
      };

      const isCompleta =
        fresh.processingStatus === "completa" || fresh.processingStatus === "pendiente_revision";

      const fallbackInfoEmergencia: VoiceEmergencyResponse["infoEmergencia"] = {
        tipo: current.infoEmergencia?.tipo ?? fresh.needType ?? null,
        severidad:
          current.infoEmergencia?.severidad ?? urgenciaASeveridad(fresh.urgency),
        personasAfectadas: current.infoEmergencia?.personasAfectadas ?? null,
        resumen: current.infoEmergencia?.resumen ?? fresh.description ?? "",
        palabrasClaveDetectadas: current.infoEmergencia?.palabrasClaveDetectadas ?? [],
        metodoExtraccion: current.infoEmergencia?.metodoExtraccion ?? "diccionario",
        isInjured: current.infoEmergencia?.isInjured ?? fresh.isInjured,
        cannotMove: current.infoEmergencia?.cannotMove ?? fresh.cannotMove,
        disabilityType: current.infoEmergencia?.disabilityType ?? fresh.disabilityType,
        communicationMode: current.infoEmergencia?.communicationMode ?? fresh.communicationMode,
        disabilitySubcategory:
          current.infoEmergencia?.disabilitySubcategory ?? fresh.disabilitySubcategory,
        name: current.infoEmergencia?.name ?? fresh.requesterName,
      };

      setServerResponse({
        ...current,
        data: fresh,
        infoEmergencia: fallbackInfoEmergencia,
      });

      console.log('[EmergencyVoice] Fallback: data actualizada', {
        status: fresh.status,
        processingStatus: fresh.processingStatus,
        urgency: fresh.urgency,
        needType: fresh.needType,
      });

      // Reflejar el processingStatus del GET en currentUpdate priorizando el
      // estado más avanzado. Si el WS ya marcó 'completa' antes, no lo
      // sobreescribimos.
      if (fresh.processingStatus) {
        const orden: Record<string, number> = {
          recibida: 1,
          procesando: 2,
          pendiente_revision: 3,
          completa: 4,
          error: 3,
        };
        const incomingRank = orden[fresh.processingStatus] ?? 0;
        const currentRank = orden[currentUpdate?.processingStatus ?? ''] ?? 0;

        if (incomingRank > currentRank) {
          setExternalUpdate({
            processingStatus: fresh.processingStatus,
            step: isCompleta ? 'completed' : currentUpdate?.step,
            message: isCompleta
              ? 'Emergencia clasificada correctamente'
              : currentUpdate?.message,
            infoEmergencia: isCompleta
              ? {
                tipo: fallbackInfoEmergencia.tipo,
                severidad: fallbackInfoEmergencia.severidad,
                resumen: fallbackInfoEmergencia.resumen,
                palabrasClaveDetectadas: fallbackInfoEmergencia.palabrasClaveDetectadas,
                disabilityType: fallbackInfoEmergencia.disabilityType,
                disabilitySubcategory: fallbackInfoEmergencia.disabilitySubcategory,
                communicationMode: fallbackInfoEmergencia.communicationMode,
                cannotMove: fallbackInfoEmergencia.cannotMove,
                isInjured: fallbackInfoEmergencia.isInjured,
              }
              : currentUpdate?.infoEmergencia,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (isCompleta) {
        alertService.success(
          "Hemos actualizado la información de tu emergencia.",
          5000
        );
      }
    } catch (err) {
      console.error('[EmergencyVoice] Fallback fetch falló:', err);
    }
  }, []);

  // Hook para procesamiento asíncrono vía WebSocket
  const { currentUpdate, isConnected, setExternalUpdate } = useEmergencyProcessing({
    emergencyId: activeEmergencyId,
    onUpdate: (update) => {
      setProcessingUpdates(prev => [...prev, update]);
    },
    onComplete: (update) => {
      console.log('[EmergencyProcessing] Complete:', update);
      // Mensaje amigable al completar
      alertService.success(
        'Hemos identificado tu emergencia.',
        5000
      );

      // Actualizar serverResponse con los datos finales del procesamiento
      console.log(serverResponse, update.infoEmergencia);
      if (serverResponse && update.infoEmergencia) {
        const info = update.infoEmergencia as Record<string, unknown>;
        setServerResponse({
          ...serverResponse,
          infoEmergencia: {
            ...serverResponse.infoEmergencia,
            tipo: (info.tipo as string) || serverResponse.infoEmergencia?.tipo,
            severidad: (info.severidad as "baja" | "media" | "alta") || serverResponse.infoEmergencia?.severidad,
            palabrasClaveDetectadas: (info.palabrasClaveDetectadas as string[]) || serverResponse.infoEmergencia?.palabrasClaveDetectadas,
            disabilityType: (info.disabilityType as string) || serverResponse.infoEmergencia?.disabilityType,
            disabilitySubcategory: (info.disabilitySubcategory as string) || serverResponse.infoEmergencia?.disabilitySubcategory,
            communicationMode: (info.communicationMode as string) || serverResponse.infoEmergencia?.communicationMode,
            cannotMove: (info.cannotMove as boolean) ?? serverResponse.infoEmergencia?.cannotMove,
            isInjured: (info.isInjured as boolean) ?? serverResponse.infoEmergencia?.isInjured,
            resumen: (info.resumen as string) || serverResponse.infoEmergencia?.resumen,
          }
        });
      }
    },
    onError: (error) => {
      console.error('[EmergencyProcessing] Error:', error);
      // Si el WS falla, refrescar la data de la emergencia tras
      scheduleFallbackFetch();
    }
  });

  const {
    isListening,
    fullTranscript,
    interimTranscript,
    audioBlob,
    audioUrl,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    reset,
    transcriptRef,
    audioBlobRef,
  } = useSpeechRecognition("es-VE");

  const { location, status: locationStatus, requestLocation } = useLocation();

  // Visibilidad del FAB controlada por la ruta / el formulario activo.
  // - `hideFAB === true`: la ruta expone su propio micrófono inline
  //   (ej. /request), por lo que ocultamos el FAB por completo.
  // - `isFormFocused === true`: el usuario está escribiendo en un
  //   input/textarea del formulario, así que minimizamos el FAB a un
  //   ícono discreto de 32px para que no tape los campos.
  const { isFormFocused, hideFAB } = useFabVisibility();
  const isMinimized = isFormFocused;

  // Refs espejo de las acciones de grabación para que el efecto que
  // reacciona al store pueda invocarlas sin quedar atrapado en un
  // orden de declaración. (El botón inline solicita start/stop desde
  // fuera; aquí lo atendemos).
  const startRecordingRef = useRef<() => Promise<void>>(async () => {});
  const handleStopRef = useRef<() => void>(() => {});
  // Ref al consentimiento para que el handler del store lea el valor
  // actual sin re-suscribirse.
  const hasConsentRef = useRef<boolean>(false);

  // Cargar consentimiento desde localStorage
  useEffect(() => {
    const consent = localStorage.getItem("sara_voice_consent");
    setHasConsent(consent === "true");
  }, []);

  // Reflejar el consentimiento en un ref para que el handler del
  // store de voz (suscrito una sola vez al montar) pueda leer el
  // valor actual sin re-suscribirse.
  useEffect(() => {
    hasConsentRef.current = hasConsent;
  }, [hasConsent]);

  // Sincronizar refs espejo para que el callback del fallback lea valores frescos
  useEffect(() => {
    activeEmergencyIdRef.current = activeEmergencyId;
  }, [activeEmergencyId]);

  useEffect(() => {
    serverResponseRef.current = serverResponse;
  }, [serverResponse]);

  // Pedir ubicación al montar si no está lista
  useEffect(() => {
    if (locationStatus === "idle") {
      requestLocation();
    }
  }, [locationStatus, requestLocation]);

  // Al abrir el modal de preview, si la ubicación aún no está lista, intentar
  // obtenerla automáticamente. Esto evita que el usuario tenga que tocar
  // "Reintentar" o "Confirmar y enviar" solo para conseguir coordenadas.
  useEffect(() => {
    if (!showPreview || !preview) return;
    // Si ya tenemos coordenadas válidas (en freshCoords, en el preview o en el
    // contexto de ubicación), no hacemos nada.
    if (freshCoords) return;
    const hasValidLocation =
      preview.latitude !== 0 ||
      preview.longitude !== 0;
    if (hasValidLocation) return;

    let cancelled = false;
    setIsRefreshingLocation(true);

    const tryGet = (): Promise<{ latitude: number; longitude: number } | null> =>
      requestLocation()
        .then((coords) => coords)
        .catch(() => null);

    (async () => {
      let coords = await tryGet();
      if (cancelled) return;
      if (!coords) {
        // Reintento tras breve delay para que el GPS se estabilice
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        coords = await tryGet();
      }
      if (cancelled) return;
      if (coords) {
        // Unificamos: guardamos en freshCoords (fuente única) y replicamos
        // en el preview para que la UI lo muestre de inmediato.
        setFreshCoords(coords);
        setPreview((p) =>
          p ? { ...p, latitude: coords!.latitude, longitude: coords!.longitude } : p,
        );
      }
      setIsRefreshingLocation(false);
    })();

    return () => {
      cancelled = true;
      setIsRefreshingLocation(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);

  // Detectar silencio de 3 segundos para auto-detener
  useEffect(() => {
    if (!isListening) return;

    const currentTranscript = fullTranscript.trim();

    // Solo iniciar timer si hay contenido
    if (currentTranscript.length > 0) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        // Usar ref para leer valor más reciente evitando stale closure
        const latest = transcriptRef.current.trim();
        if (latest === lastTranscriptRef.current && latest.length > 0) {
          handleStop();
        }
      }, 3000);
    }

    lastTranscriptRef.current = currentTranscript;

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [fullTranscript, isListening, transcriptRef]);

  const handleButtonClick = useCallback(() => {
    if (state === "idle") {
      if (!hasConsent) {
        setShowConsent(true);
      } else {
        startRecording();
      }
    } else if (state === "listening") {
      handleStop();
    }
  }, [state, hasConsent]);

  const startRecording = useCallback(async () => {
    recordingStartRef.current = Date.now();
    setState("listening");
    await startListening();
    lastTranscriptRef.current = "";
  }, [startListening]);

  const handleStop = useCallback(() => {
    stopListening();
    setState("processing");

    const durationSec = Math.round((Date.now() - recordingStartRef.current) / 1000);

    // Delay para que MediaRecorder.onstop procese los chunks y setee audioBlobRef
    setTimeout(() => {
      // Leer valores frescos desde refs (evita stale closure)
      const transcript = transcriptRef.current.trim();
      const blob = audioBlobRef.current;

      // Si no hay transcripción ni audio → error real
      if (!transcript && !blob) {
        alertService.warning("No se detectó audio. Intenta de nuevo.");
        setState("idle");
        reset();
        return;
      }

      // No abortamos si aún no hay ubicación: el modal de confirmación
      // reintentará la geolocalización justo antes de enviar el reporte.
      // Usamos coordenadas 0/0 como placeholder si no hay; serán sobrescritas
      // (o se mostrará error) en handleSubmitEmergency.
      const fallbackLat = location?.latitude ?? 0;
      const fallbackLng = location?.longitude ?? 0;

      setPreview({
        transcript,
        latitude: fallbackLat,
        longitude: fallbackLng,
        durationSec,
      });
      setShowPreview(true);
      setState("idle");
    }, 600);
  }, [stopListening, reset, location, transcriptRef, audioBlobRef]);

  const handleAcceptConsent = useCallback(() => {
    localStorage.setItem("sara_voice_consent", "true");
    setHasConsent(true);
    setShowConsent(false);
    startRecording();
  }, [startRecording]);

  // Publicar la fase actual del grabador en el store global para que
  // componentes como `InlineMicButton` puedan reflejar el estado
  // (idle / listening / processing / success) en su UI.
  useEffect(() => {
    voiceRecorderSetPhase(state);
  }, [state]);

  // Mantener refs sincronizadas con los handlers reales. Permite que
  // el efecto de `pendingAction` (suscrito una sola vez) invoque las
  // versiones más recientes sin re-suscribirse.
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  // Reaccionar a solicitudes externas (p. ej. InlineMicButton) de
  // iniciar o detener la grabación. Se suscribe una sola vez al
  // montar y consume `pendingAction` desde el store.
  useEffect(() => {
    // Procesa la última `pendingAction` del store (si la hay) y la
    // ejecuta a través de los refs (versiones más recientes de los
    // handlers, sin quedar atrapado en el orden de declaración).
    const tick = () => {
      const snap = getVoiceRecorderSnapshot();
      if (!snap.pendingAction) return;
      if (snap.pendingAction === "start") {
        // El FAB tiene su propio modal de consentimiento; si el
        // usuario aún no consintió, la versión UI se abrirá cuando
        // intente grabar de nuevo. Limpiamos el flag de todos modos
        // para no entrar en bucle.
        if (hasConsentRef.current) {
          startRecordingRef.current();
        }
      } else if (snap.pendingAction === "stop") {
        handleStopRef.current();
      }
      voiceRecorderClearPending();
    };

    // Re-entrante: tick() ya limpia `pendingAction` antes de invocar
    // a los handlers. Aun así, los handlers pueden cambiar `state`,
    // lo que emite un nuevo snapshot pero ya con `pendingAction ===
    // null`, así que no se vuelve a ejecutar.
    const unsubscribe = subscribeVoiceRecorder(tick);

    // Procesar pendientes que ya estuvieran en cola al montar
    // (caso poco probable pero correcto en HMR / re-mounts).
    tick();

    return unsubscribe;
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreview(null);
    setServerResponse(null);
    setActiveEmergencyId(null);
    setFreshCoords(null);
    reset();
  }, [reset]);

  /**
   * Devuelve coordenadas válidas para enviar la emergencia. Orden de prioridad:
   *  1. `freshCoords` (lo capturado al abrir el preview / tras "Reintentar")
   *  2. `location` del contexto (si llegó tras montar el componente)
   *  3. Reintenta obtener una ubicación fresca (1 intento + 1 reintento)
   */
  const ensureFreshLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (freshCoords) return freshCoords;
    if (location && location.latitude !== 0 && location.longitude !== 0) {
      setFreshCoords(location);
      return location;
    }

    setIsRefreshingLocation(true);
    try {
      const coords = await requestLocation();
      setFreshCoords(coords);
      return coords;
    } catch (firstErr) {
      console.warn('[ButtonEmergencyVoice] Primer intento de ubicación falló, reintentando…', firstErr);
      try {
        await new Promise((r) => setTimeout(r, 800));
        const coords = await requestLocation();
        setFreshCoords(coords);
        return coords;
      } catch (secondErr) {
        console.error('[ButtonEmergencyVoice] Segundo intento de ubicación falló:', secondErr);
        return null;
      }
    } finally {
      setIsRefreshingLocation(false);
    }
  }, [freshCoords, location, requestLocation]);

  const handleSubmitEmergency = useCallback(async () => {
    const blob = audioBlobRef.current;
    if (!preview || !blob) {
      alertService.error("Faltan datos para enviar la emergencia");
      return;
    }

    setIsSubmitting(true);

    try {
      // Re-obtener ubicación al confirmar: la captura inicial puede no estar
      // lista (GPS frío, permiso recién concedido, etc.). Solo abortamos si
      // tras 2 intentos seguimos sin coordenadas válidas.
      const freshCoords = await ensureFreshLocation();

      if (!freshCoords) {
        alertService.error(
          "No pudimos obtener tu ubicación. Activa el GPS e inténtalo de nuevo.",
        );
        setIsSubmitting(false);
        return;
      }

      const transcript = preview.transcript || null;

      const response = await sendEmergencyVoice({
        audioBlob: blob,
        transcript,
        latitude: freshCoords.latitude,
        longitude: freshCoords.longitude,
        voiceNoteDurationSec: preview.durationSec > 0 ? preview.durationSec : undefined,
      });

      console.log('[EmergencyVoice] Respuesta inicial:', response);

      // Guardar la respuesta inicial y el ID para WebSocket
      setServerResponse(response);
      setActiveEmergencyId(response.data.id);

      setState("success");
      // Mensaje amigable al enviar, consistente con el formulario manual
      alertService.success(
        "Tu alerta ya está en nuestro mapa. Mantente en un lugar seguro.",
        5000
      );
    } catch (err: any) {
      console.error("[ButtonEmergencyVoice] Error:", err);
      alertService.error(err.message || "Error al enviar la emergencia");
      setIsSubmitting(false);
    }
  }, [preview, audioBlobRef, ensureFreshLocation]);

  const renderButtonIcon = () => {
    // Tamaño del ícono: más pequeño cuando el FAB está minimizado
    // para que el círculo de 32px no quede saturado.
    const iconClass = isMinimized ? "text-xl" : "text-3xl";
    switch (state) {
      case "idle":
        return <span className={`material-symbols-rounded ${iconClass}`}>mic</span>;
      case "listening":
        return (
          <div className="relative">
            <span className={`material-symbols-rounded ${iconClass} animate-pulse`}>mic</span>
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          </div>
        );
      case "processing":
        return (
          <span className={`material-symbols-rounded ${iconClass} animate-spin`}>progress_activity</span>
        );
      case "success":
        return <span className={`material-symbols-rounded ${iconClass}`}>check_circle</span>;
    }
  };

  const getButtonLabel = () => {
    switch (state) {
      case "idle":
        return "Reportar emergencia por voz";
      case "listening":
        return "Escuchando... (toca para detener)";
      case "processing":
        return "Procesando...";
      case "success":
        return "¡Emergencia reportada!";
    }
  };

  /**
   * Cuando la ruta opta por ocultar el FAB (`hideFAB = true`), no
   * renderizamos el botón flotante ni el overlay de transcripción
   * (ese overlay es propio del FAB). Los modales de consentimiento,
   * preview y éxito siguen siendo accesibles porque viven en su propio
   * árbol.
   */
  const shouldRenderFab = !hideFAB;

  // Mientras el FAB está minimizado pero grabando, lo expandimos a un
  // tamaño intermedio (48px) para que el target de toque sea cómodo
  // y detener la grabación no requiera precisión quirúrgica.
  const isMinimizedRecording = isMinimized && state === "listening";

  // Clases dinámicas del FAB en función de estado y minimización.
  // Importante: las clases fijas (z-50, fixed, etc.) siempre se mantienen;
  // solo cambian tamaño, padding, opacidad y contenido visible.
  // - Minimizado idle: padding 0, justify-center (ícono único), sin gap.
  // - Minimizado grabando: mismo padding 0 (círculo) pero más grande y opacidad plena.
  // - Expandido: padding generoso para acomodar ícono + label.
  const fabSizeClass = isMinimized
    ? "p-0 justify-center"
    : `${FAB_FULL_SIZE_CLASS} gap-3`;
  const fabStyle = isMinimized
    ? {
        width: `${isMinimizedRecording ? FAB_MINIMIZED_RECORDING_SIZE_PX : FAB_MINIMIZED_SIZE_PX}px`,
        height: `${isMinimizedRecording ? FAB_MINIMIZED_RECORDING_SIZE_PX : FAB_MINIMIZED_SIZE_PX}px`,
        // Al grabar recuperamos opacidad plena para que el botón
        // comunique claramente que es interactivo.
        opacity: isMinimizedRecording ? 1 : FAB_MINIMIZED_OPACITY,
      }
    : undefined;

  return (
    <>
      {/* Botón flotante */}
      {shouldRenderFab && (
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={state === "processing"}
          className={`fixed bottom-24 right-4 z-50 flex items-center ${fabSizeClass} rounded-full shadow-lg transition-all duration-200 ${
            state === "listening"
              ? "bg-red-800 text-white scale-110"
              : state === "processing"
                ? "bg-yellow-600 text-white"
                : "bg-red-900 text-white hover:bg-red-800 hover:scale-105"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          style={fabStyle}
          aria-label={getButtonLabel()}
          aria-hidden={isMinimized}
          tabIndex={isMinimized ? -1 : 0}
          title={getButtonLabel()}
        >
          {renderButtonIcon()}
          {!isMinimized && (
            <div className="flex flex-col items-start leading-tight">
              {state === "idle" && (
                <span className="font-bold text-base sm:text-lg">SOS</span>
              )}
              <span className="font-medium text-[11px] sm:text-xs opacity-90">{getButtonLabel()}</span>
            </div>
          )}
        </button>
      )}

      {/* Overlay de transcripción en tiempo real */}
      {shouldRenderFab && isListening && (
        <div className="fixed bottom-36 right-4 z-40 max-w-xs bg-surface-container-lowest rounded-xl shadow-xl p-4 border border-outline-variant">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-rounded text-red-600 animate-pulse">
              fiber_manual_record
            </span>
            <span className="text-xs font-semibold text-on-surface">
              Grabando...
            </span>
          </div>
          <div className="text-sm text-on-surface-variant min-h-[3rem] max-h-32 overflow-y-auto">
            {fullTranscript ? (
              <>
                <span>{fullTranscript}</span>
                {interimTranscript && (
                  <span className="text-on-surface-variant/60 italic"> {interimTranscript}</span>
                )}
              </>
            ) : (
              <span className="italic text-on-surface-variant/60">
                Esperando que hables...
              </span>
            )}
          </div>
          {!isSupported && (
            <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
              <span className="material-symbols-rounded text-sm align-middle mr-1">
                warning
              </span>
              Tu navegador no soporta transcripción automática. Completa el formulario manualmente.
            </div>
          )}
          {speechError && (
            <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded">
              <span className="material-symbols-rounded text-sm align-middle mr-1">
                error
              </span>
              {speechError}
            </div>
          )}
        </div>
      )}

      {/* Modal de consentimiento */}
      <ConsentModal
        isOpen={showConsent}
        onClose={() => setShowConsent(false)}
        onAccept={handleAcceptConsent}
      />

      {/* Preview: revisión antes de enviar al backend */}
      {showPreview && preview && !serverResponse && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={handleClosePreview}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-4xl text-primary">mic</span>
              <h2 className="text-xl font-bold text-on-surface">Revisa tu reporte de voz</h2>
            </div>

            <p className="text-sm text-on-surface-variant">
              El audio y tu ubicación se enviarán al servidor para clasificar la emergencia automáticamente.
            </p>

            {/* Transcript */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">
                {preview.transcript ? "Lo que dijiste:" : "Transcripción:"}
              </label>
              <div className="bg-surface-container-low rounded-lg p-3 text-sm text-on-surface-variant max-h-32 overflow-y-auto">
                {preview.transcript || (
                  <span className="italic">
                    No se obtuvo transcripción. El servidor procesará solo el audio.
                  </span>
                )}
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-on-surface">
                  Tu ubicación:
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingLocation(true);
                    try {
                      const coords = await requestLocation();
                      setFreshCoords(coords);
                      setPreview((p) =>
                        p ? { ...p, latitude: coords.latitude, longitude: coords.longitude } : p,
                      );
                    } catch {
                      alertService.warning(
                        "No pudimos refrescar la ubicación. Verifica tu GPS.",
                      );
                    } finally {
                      setIsRefreshingLocation(false);
                    }
                  }}
                  disabled={isRefreshingLocation || isSubmitting}
                  className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                  aria-label="Reintentar obtener ubicación manualmente"
                >
                  <span
                    className={`material-symbols-rounded text-xs ${isRefreshingLocation ? "animate-spin" : ""}`}
                  >
                    {isRefreshingLocation ? "progress_activity" : "refresh"}
                  </span>
                  {isRefreshingLocation ? "Obteniendo…" : "Reintentar"}
                </button>
              </div>
              <div
                className={`rounded-lg p-3 text-xs font-mono flex items-center gap-2 ${
                  !freshCoords
                    ? "bg-yellow-50 text-yellow-900 border border-yellow-300"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {isRefreshingLocation && (
                  <span className="material-symbols-rounded text-base animate-spin text-primary">
                    progress_activity
                  </span>
                )}
                <span>
                  {!freshCoords
                    ? isRefreshingLocation
                      ? "Obteniendo tu ubicación automáticamente…"
                      : "Aún no tenemos tu ubicación. Intenta de nuevo o toca Reintentar."
                    : `Lat: ${freshCoords.latitude.toFixed(6)}, Lng: ${freshCoords.longitude.toFixed(6)}`}
                </span>
              </div>
            </div>

            {/* Audio player */}
            {audioUrl && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface">
                  Audio grabado ({preview.durationSec}s):
                </label>
                <audio controls src={audioUrl} className="w-full h-10" />
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClosePreview}
                disabled={isSubmitting || isRefreshingLocation}
                className="flex-1 px-4 py-3 rounded-xl border border-outline text-on-surface hover:bg-surface-container transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitEmergency}
                disabled={isSubmitting || isRefreshingLocation}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshingLocation
                  ? "Obteniendo ubicación…"
                  : isSubmitting
                    ? "Enviando..."
                    : "Confirmar y enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Éxito: respuesta del backend con procesamiento en tiempo real */}
      {serverResponse && (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={handleClosePreview}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con estado de procesamiento */}
            <div className="flex items-center gap-3">
              {currentUpdate?.processingStatus === 'completa' || !activeEmergencyId ? (
                <span className="material-symbols-rounded text-4xl text-success">check_circle</span>
              ) : currentUpdate?.processingStatus === 'error' ? (
                <span className="material-symbols-rounded text-4xl text-error">error</span>
              ) : (
                <span className="material-symbols-rounded text-4xl text-primary">progress_activity</span>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-on-surface">
                  {currentUpdate?.processingStatus === 'completa' || !activeEmergencyId
                    ? '¡Emergencia reportada!'
                    : currentUpdate?.processingStatus === 'error'
                    ? 'Error en el procesamiento'
                    : 'Procesando emergencia...'}
                </h2>
                <p className="text-xs text-on-surface-variant">
                  ID: {serverResponse.data.id}
                </p>
              </div>
            </div>

            {/* Mensaje tranquilizador persistente dentro del modal */}
            <div className="bg-success-container/30 border border-success/20 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-rounded text-success text-2xl flex-shrink-0 mt-0.5">verified_user</span>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-on-surface">
                  Tu alerta ya está en nuestro mapa
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Ya notificamos a voluntarios y puntos de apoyo cercanos. No cierres esta ventana y mantente en un lugar seguro mientras llega la ayuda.
                </p>
              </div>
            </div>

            {/* Estado de procesamiento */}
            {activeEmergencyId && currentUpdate && currentUpdate.processingStatus !== 'completa' && (
              <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-primary text-sm animate-pulse">
                    {currentUpdate.processingStatus === 'recibida' && 'hourglass_empty'}
                    {currentUpdate.processingStatus === 'procesando' && 'settings'}
                    {currentUpdate.processingStatus === 'pendiente_revision' && 'pending'}
                    {currentUpdate.processingStatus === 'error' && 'error'}
                  </span>
                  <label className="text-sm font-semibold text-on-surface">
                    {currentUpdate.processingStatus === 'recibida' && 'Emergencia recibida'}
                    {currentUpdate.processingStatus === 'procesando' && 'Procesando audio y datos'}
                    {currentUpdate.processingStatus === 'pendiente_revision' && 'Pendiente de revisión'}
                    {currentUpdate.processingStatus === 'error' && 'Error en el procesamiento'}
                  </label>
                </div>
                
                {currentUpdate.step && (
                  <div className="text-xs text-on-surface-variant">
                    Paso actual: {currentUpdate.step}
                  </div>
                )}
                
                {currentUpdate.message && (
                  <p className="text-sm text-on-surface-variant">
                    {currentUpdate.message}
                  </p>
                )}
              </div>
            )}

            {/* Clasificación del backend */}
            {serverResponse.infoEmergencia && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-primary text-sm">smart_toy</span>
                  <label className="text-sm font-semibold text-on-surface">
                    Clasificación automática
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-on-surface-variant text-xs">Tipo:</span>
                    <p className="font-medium text-on-surface capitalize">
                      {serverResponse.infoEmergencia.tipo || "No detectado"}
                    </p>
                  </div>

                  <div>
                    <span className="text-on-surface-variant text-xs">Severidad:</span>
                    <p className={`font-bold ${
                      serverResponse.infoEmergencia.severidad === "alta" ? "text-red-600" :
                      serverResponse.infoEmergencia.severidad === "media" ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {serverResponse.infoEmergencia.severidad?.toUpperCase() || "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-on-surface-variant text-xs">¿Herido?</span>
                    <p className="font-medium text-on-surface">
                      {serverResponse.infoEmergencia.isInjured ? "Sí" : "No"}
                    </p>
                  </div>

                  <div>
                    <span className="text-on-surface-variant text-xs">¿Inmovilizado?</span>
                    <p className="font-medium text-on-surface">
                      {serverResponse.infoEmergencia.cannotMove ? "Sí" : "No"}
                    </p>
                  </div>

                  {serverResponse.infoEmergencia.personasAfectadas !== null && (
                    <div className="col-span-2">
                      <span className="text-on-surface-variant text-xs">Personas afectadas:</span>
                      <p className="font-medium text-on-surface">
                        {serverResponse.infoEmergencia.personasAfectadas}
                      </p>
                    </div>
                  )}
                </div>

                {serverResponse.infoEmergencia.resumen && (
                  <div>
                    <span className="text-on-surface-variant text-xs">Resumen:</span>
                    <p className="text-sm text-on-surface mt-0.5">
                      {serverResponse.infoEmergencia.resumen}
                    </p>
                  </div>
                )}

                {serverResponse.infoEmergencia.palabrasClaveDetectadas?.length > 0 && (
                  <div>
                    <span className="text-on-surface-variant text-xs">Palabras clave detectadas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {serverResponse.infoEmergencia.palabrasClaveDetectadas.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ubicación registrada */}
            <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant font-mono">
              Lat: {serverResponse.data.latitude}, Lng: {serverResponse.data.longitude}
            </div>

            {serverResponse.data.voiceNoteUrl && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface">Audio guardado:</label>
                <audio controls src={serverResponse.data.voiceNoteUrl} className="w-full h-10" />
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClosePreview}
                className="flex-1 px-4 py-3 rounded-xl border border-outline text-on-surface hover:bg-surface-container transition-colors font-medium"
              >
                Cerrar
              </button>
              <a
                href={`/mapa?selected=${encodeURIComponent(serverResponse.data.id)}`}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors font-bold text-center"
              >
                Ver en el mapa
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Alias semántico de `ButtonEmergencyVoice` (default export). El
 * nombre `FloatingVoiceButton` se usa en la documentación y en
 * la conversación con el equipo para hacer explícito que se trata
 * del FAB flotante que vive en el layout principal.
 */
export { ButtonEmergencyVoice as FloatingVoiceButton };

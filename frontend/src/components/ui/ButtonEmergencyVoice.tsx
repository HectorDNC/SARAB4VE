"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useLocation } from "@/hooks/useLocation";
import ConsentModal from "./ConsentModal";
import { sendEmergencyVoice, type VoiceEmergencyResponse } from "@/api/emergencies";
import { alertService } from "@/services/alertService";
import { useEmergencyProcessing, type ProcessingUpdate } from "@/hooks/useEmergencyProcessing";

type ButtonState = "idle" | "listening" | "processing" | "success";

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
  // Respuesta del backend tras enviar — para mostrar pantalla de éxito con clasificación
  const [serverResponse, setServerResponse] = useState<VoiceEmergencyResponse | null>(null);
  // Emergency ID para suscribirse a WebSocket
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(null);
  // Actualizaciones de procesamiento en tiempo real
  const [processingUpdates, setProcessingUpdates] = useState<ProcessingUpdate[]>([]);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const recordingStartRef = useRef<number>(0);

  // Hook para procesamiento asíncrono vía WebSocket
  const { currentUpdate, isConnected } = useEmergencyProcessing({
    emergencyId: activeEmergencyId,
    onUpdate: (update) => {
      console.log('[EmergencyProcessing] Update:', update);
      setProcessingUpdates(prev => [...prev, update]);
      
      // Mostrar notificación de progreso
      if (update.message) {
        alertService.info(update.message, 3000);
      }
    },
    onComplete: (update) => {
      console.log('[EmergencyProcessing] Complete:', update);
      alertService.success('Emergencia procesada completamente', 5000);
      
      // Actualizar serverResponse con los datos finales del procesamiento
      if (serverResponse && update.infoEmergencia) {
        const info = update.infoEmergencia as Record<string, unknown>;
        setServerResponse({
          ...serverResponse,
          infoEmergencia: {
            ...serverResponse.infoEmergencia,
            tipo: (info.tipo as string) || serverResponse.infoEmergencia.tipo,
            severidad: (info.severidad as "baja" | "media" | "alta") || serverResponse.infoEmergencia.severidad,
            palabrasClaveDetectadas: (info.palabrasClaveDetectadas as string[]) || serverResponse.infoEmergencia.palabrasClaveDetectadas,
            disabilityType: (info.disabilityType as string) || serverResponse.infoEmergencia?.disabilityType,
            disabilitySubcategory: (info.disabilitySubcategory as string) || serverResponse.infoEmergencia.disabilitySubcategory,
            communicationMode: (info.communicationMode as string) || serverResponse.infoEmergencia.communicationMode,
            cannotMove: (info.cannotMove as boolean) ?? serverResponse.infoEmergencia.cannotMove,
            isInjured: (info.isInjured as boolean) ?? serverResponse.infoEmergencia.isInjured,
            resumen: (info.resumen as string) || serverResponse.infoEmergencia.resumen,
          }
        });
      }
    },
    onError: (error) => {
      console.error('[EmergencyProcessing] Error:', error);
      alertService.error(`Error en el procesamiento: ${error}`, 6000);
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

  // Cargar consentimiento desde localStorage
  useEffect(() => {
    const consent = localStorage.getItem("sara_voice_consent");
    setHasConsent(consent === "true");
  }, []);

  // Pedir ubicación al montar si no está lista
  useEffect(() => {
    if (locationStatus === "idle") {
      requestLocation();
    }
  }, [locationStatus, requestLocation]);

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

      // Requerimos coordenadas para el backend voice endpoint
      if (!location) {
        alertService.warning("Necesitamos tu ubicación para reportar. Activa el GPS.");
        setState("idle");
        reset();
        return;
      }

      setPreview({
        transcript,
        latitude: location.latitude,
        longitude: location.longitude,
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

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreview(null);
    setServerResponse(null);
    reset();
  }, [reset]);

  const handleSubmitEmergency = useCallback(async () => {
    const blob = audioBlobRef.current;
    if (!preview || !blob) {
      alertService.error("Faltan datos para enviar la emergencia");
      return;
    }

    setIsSubmitting(true);

    try {
      const transcript = preview.transcript || null;

      const response = await sendEmergencyVoice({
        audioBlob: blob,
        transcript,
        latitude: preview.latitude,
        longitude: preview.longitude,
        voiceNoteDurationSec: preview.durationSec > 0 ? preview.durationSec : undefined,
      });

      console.log('[EmergencyVoice] Respuesta inicial:', response);
      
      // Guardar la respuesta inicial y el ID para WebSocket
      setServerResponse(response);
      setActiveEmergencyId(response.data.id);
      
      setState("success");
      alertService.success(
        'Emergencia registrada. Procesando audio y extrayendo información...',
        4000
      );
    } catch (err: any) {
      console.error("[ButtonEmergencyVoice] Error:", err);
      alertService.error(err.message || "Error al enviar la emergencia");
      setIsSubmitting(false);
    }
  }, [preview, audioBlobRef]);

  const renderButtonIcon = () => {
    switch (state) {
      case "idle":
        return <span className="material-symbols-rounded text-3xl">mic</span>;
      case "listening":
        return (
          <div className="relative">
            <span className="material-symbols-rounded text-3xl animate-pulse">mic</span>
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          </div>
        );
      case "processing":
        return (
          <span className="material-symbols-rounded text-3xl animate-spin">progress_activity</span>
        );
      case "success":
        return <span className="material-symbols-rounded text-3xl">check_circle</span>;
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

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={state === "processing"}
        className={`fixed bottom-24 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-full shadow-lg transition-all duration-200 ${
          state === "listening"
            ? "bg-red-600 text-white scale-110"
            : state === "processing"
              ? "bg-yellow-600 text-white"
              : "bg-primary text-on-primary hover:bg-primary/90 hover:scale-105"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={getButtonLabel()}
        title={getButtonLabel()}
      >
        {renderButtonIcon()}
        <span className="font-semibold text-sm hidden sm:inline">{getButtonLabel()}</span>
      </button>

      {/* Overlay de transcripción en tiempo real */}
      {isListening && (
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
              <label className="text-sm font-semibold text-on-surface">
                Tu ubicación:
              </label>
              <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant font-mono">
                Lat: {preview.latitude.toFixed(6)}, Lng: {preview.longitude.toFixed(6)}
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
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl border border-outline text-on-surface hover:bg-surface-container transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitEmergency}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Enviando..." : "Confirmar y enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Éxito: respuesta del backend con procesamiento en tiempo real */}
      {serverResponse && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
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
                {activeEmergencyId && currentUpdate && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`}></div>
                    <span className="text-xs text-on-surface-variant">
                      {isConnected ? 'Conectado' : 'Reconectando...'}
                    </span>
                  </div>
                )}
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
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    serverResponse.infoEmergencia.metodoExtraccion === "ia"
                      ? "bg-primary-container/20 text-primary"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}>
                    {serverResponse.infoEmergencia.metodoExtraccion === "ia" ? "IA" : "Diccionario"}
                  </span>
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

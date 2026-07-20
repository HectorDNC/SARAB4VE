import { useEffect, useRef, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ProcessingStatus = 
  | 'recibida' 
  | 'procesando' 
  | 'completa' 
  | 'pendiente_revision' 
  | 'error';

export type ProcessingStep = 
  | 'audio_uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'extracting'
  | 'data_extracted'
  | 'completed'
  | 'error';

export interface ProcessingUpdate {
  emergencyId: string;
  processingStatus: ProcessingStatus;
  step?: ProcessingStep;
  message?: string;
  audioUrl?: string;
  transcript?: string;
  transcriptMethod?: string;
  infoEmergencia?: Record<string, unknown> | null;
  processingError?: string;
  timestamp: string;
}

/** Mensaje que envía el backend envuelto */
interface WebSocketEnvelope {
  type: 'subscribed' | 'emergency_update';
  emergencyId?: string;
  timestamp?: string;
  data?: ProcessingUpdate;
  [key: string]: unknown;
}

interface UseEmergencyProcessingOptions {
  emergencyId: string | null;
  onUpdate?: (update: ProcessingUpdate) => void;
  onComplete?: (update: ProcessingUpdate) => void;
  onError?: (error: string) => void;
}

/**
 * Deriva la URL WebSocket del backend a partir de NEXT_PUBLIC_API_URL.
 * Convierte http(s)://host:port → ws(s)://host:port/ws
 */
function getWebSocketUrl(): string {
  const apiUrl = API;
  try {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    return url.toString();
  } catch {
    // Fallback: asumir localhost:3001
    return 'ws://localhost:3001/ws';
  }
}

export function useEmergencyProcessing({
  emergencyId,
  onUpdate,
  onComplete,
  onError,
}: UseEmergencyProcessingOptions) {
  const [currentUpdate, setCurrentUpdate] = useState<ProcessingUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const subscribedRef = useRef(false);

  // Mantener refs estables de los callbacks para no recrear el WebSocket
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onUpdateRef.current = onUpdate;
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const emergencyIdRef = useRef(emergencyId);
  emergencyIdRef.current = emergencyId;

  const connect = useCallback(() => {
    const eid = emergencyIdRef.current;
    if (!eid) return;

    const wsUrl = getWebSocketUrl();
    console.log('[WebSocket] Conectando a:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] Conectado al servidor');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      subscribedRef.current = false;

      // Enviar mensaje de subscribe con el emergencyId
      const subscribeMsg = JSON.stringify({
        type: 'subscribe',
        emergencyId: eid,
      });
      console.log('[WebSocket] Enviando subscribe:', subscribeMsg);
      ws.send(subscribeMsg);
    };

    ws.onmessage = (event) => {
      try {
        const envelope: WebSocketEnvelope = JSON.parse(event.data);
        console.log('[WebSocket] Mensaje recibido:', envelope);

        // Ignorar confirmación de subscribe
        if (envelope.type === 'subscribed') {
          subscribedRef.current = true;
          console.log('[WebSocket] Suscripción confirmada para emergencia:', envelope.emergencyId);
          return;
        }

        // Extraer la actualización del envelope
        if (envelope.type === 'emergency_update') {
          // El backend envía { type, emergencyId, data, timestamp }
          // 'data' puede ser un objeto con los campos, o los campos pueden estar en el nivel raíz
          const update: ProcessingUpdate = (envelope.data as ProcessingUpdate) ?? {
            emergencyId: envelope.emergencyId || eid,
            processingStatus: (envelope as unknown as ProcessingUpdate).processingStatus || 'procesando',
            step: (envelope as unknown as ProcessingUpdate).step,
            message: (envelope as unknown as ProcessingUpdate).message,
            transcript: (envelope as unknown as ProcessingUpdate).transcript,
            infoEmergencia: (envelope as unknown as ProcessingUpdate).infoEmergencia,
            processingError: (envelope as unknown as ProcessingUpdate).processingError,
            timestamp: envelope.timestamp || new Date().toISOString(),
          };

          console.log('[WebSocket] Update extraído:', update);
          setCurrentUpdate(update);
          onUpdateRef.current?.(update);

          const status = update.processingStatus;
          if (status === 'completa' || status === 'pendiente_revision') {
            onCompleteRef.current?.(update);
            ws.close(1000, 'Processing complete');
          } else if (status === 'error') {
            onErrorRef.current?.(update.processingError || 'Error desconocido en el procesamiento');
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error al parsear mensaje:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error de conexión:', error);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Desconectado. Code:', event.code, 'Reason:', event.reason);
      setIsConnected(false);
      wsRef.current = null;

      // Cierre intencional (1000) → no reconectar
      if (event.code === 1000) return;

      // Intentar reconectar
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = 2000 * reconnectAttempts.current;
        console.log(`[WebSocket] Reintentando conexión en ${delay}ms (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
        setTimeout(() => {
          if (emergencyIdRef.current) {
            connect();
          }
        }, delay);
      } else {
        console.warn('[WebSocket] Máximo de reintentos alcanzado');
        onErrorRef.current?.('No se pudo mantener la conexión WebSocket. Los datos pueden estar desactualizados.');
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (emergencyId) {
      // Cerrar conexión previa si existe
      if (wsRef.current) {
        wsRef.current.close(1000, 'Reconnecting with new emergencyId');
        wsRef.current = null;
      }
      reconnectAttempts.current = 0;
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergencyId]);

  return {
    currentUpdate,
    isConnected,
  };
}

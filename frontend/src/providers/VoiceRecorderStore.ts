"use client";

/**
 * Store ligero (sin dependencias) compartido entre el FAB flotante y el
 * botón de micrófono inline. Permite que el botón inline (por ejemplo
 * dentro de un formulario en `/request`) dispare el mismo flujo de
 * grabación que el FAB, sin duplicar estado ni WebSockets.
 *
 * El hook `useVoiceRecorderState` vive en un archivo .tsx separado
 * (`src/hooks/useVoiceRecorderState.ts`) para integrar correctamente
 * con `useSyncExternalStore` desde React 18.
 */

export type VoiceRecorderPhase =
  | "idle"
  | "listening"
  | "processing"
  | "success";

export interface VoiceRecorderState {
  /** Fase actual del grabador. Útil para que la UI sincronice indicadores. */
  phase: VoiceRecorderPhase;
  /** Indica si se ha pedido iniciar o detener la grabación. */
  pendingAction: "start" | "stop" | null;
}

const initialState: VoiceRecorderState = {
  phase: "idle",
  pendingAction: null,
};

let state: VoiceRecorderState = initialState;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: Partial<VoiceRecorderState>) {
  state = { ...state, ...next };
  emit();
}

// ── API pública del store ──────────────────────────────────────────────────

export function subscribeVoiceRecorder(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVoiceRecorderSnapshot(): VoiceRecorderState {
  return state;
}

export function getVoiceRecorderServerSnapshot(): VoiceRecorderState {
  return initialState;
}

/**
 * El FAB notifica al store cuando cambia su fase. Otros consumidores
 * (botón inline) pueden leer `phase` para reflejar el estado.
 */
export function voiceRecorderSetPhase(phase: VoiceRecorderPhase): void {
  setState({ phase });
}

/**
 * Consumido por el botón inline para pedir al FAB que inicie o
 * detenga la grabación. El FAB, dentro de su efecto sobre
 * `pendingAction`, ejecuta la acción y limpia el flag.
 */
export function voiceRecorderRequest(action: "start" | "stop"): void {
  setState({ pendingAction: action });
}

export function voiceRecorderClearPending(): void {
  setState({ pendingAction: null });
}

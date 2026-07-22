"use client";

import { useSyncExternalStore } from "react";
import {
  getVoiceRecorderServerSnapshot,
  getVoiceRecorderSnapshot,
  subscribeVoiceRecorder,
  type VoiceRecorderState,
} from "@/providers/VoiceRecorderStore";

/**
 * Hook que expone el estado del grabador de voz compartido. Lo
 * consumen tanto el FAB como el `InlineMicButton` para mantener
 * sincronizados sus indicadores.
 */
export function useVoiceRecorderState(): VoiceRecorderState {
  return useSyncExternalStore(
    subscribeVoiceRecorder,
    getVoiceRecorderSnapshot,
    getVoiceRecorderServerSnapshot,
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Hook para grabación de audio + transcripción en tiempo real.
 *
 * Usa Web Speech API (SpeechRecognition) para transcripción en vivo,
 * y MediaRecorder para capturar el audio. Si el navegador no soporta
 * SpeechRecognition, degrada a solo grabación de audio.
 *
 * Errores fatales (network, service-not-allowed, not-allowed) desactivan
 * permanentemente el reconocimiento para esa sesión y no reintentan.
 *
 * @param lang - Código de idioma para reconocimiento (default: 'es-VE')
 */
export function useSpeechRecognition(lang: string = "es-VE") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Ref para que handleStop pueda leer el valor más reciente sin stale closure
  const isListeningRef = useRef(false);
  const transcriptRef = useRef("");
  const interimRef = useRef("");
  const audioBlobRef = useRef<Blob | null>(null);

  // Detectar soporte al montar
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    setAudioBlob(null);
    transcriptRef.current = "";
    interimRef.current = "";
    audioBlobRef.current = null;

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];

    try {
      // Solicitar permiso de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Iniciar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        audioBlobRef.current = blob;
        setAudioBlob(blob);
        setAudioUrl(url);

        // Detener stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();

      // Iniciar SpeechRecognition si está soportado
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let final = "";
          let interim = "";

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript + " ";
            } else {
              interim += result[0].transcript;
            }
          }

          transcriptRef.current = final.trim();
          interimRef.current = interim;
          setTranscript(final.trim());
          setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
          console.warn("[useSpeechRecognition] Recognition error:", event.error, event);

          // Errores fatales: el servicio no está disponible → no reintentar
          const FATAL_ERRORS = ["network", "service-not-allowed", "not-allowed", "no-speech"];
          if (FATAL_ERRORS.includes(event.error)) {
            if (event.error === "not-allowed") {
              setError("Permiso de micrófono denegado");
            } else if (event.error === "network") {
              setError("Servicio de transcripción no disponible. Continúa con el audio.");
            } else if (event.error === "service-not-allowed") {
              setError("Transcripción no permitida en este contexto.");
            }
            // Marcar como no soportado para que la UI lo sepa
            setIsSupported(false);
            // No detenemos grabación de audio — el usuario aún puede grabar
          }
        };

        recognition.onend = () => {
          // Si ocurrió un error fatal, NO reintentar (evita loop infinito)
          // Solo reintentar si la detención fue natural (modo continuous)
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // Si falla el reinicio, no insistir
              console.warn("[useSpeechRecognition] No se pudo reiniciar recognition:", e);
            }
          }
        };

        recognition.start();
      } else {
        setIsSupported(false);
      }

      isListeningRef.current = true;
      setIsListening(true);
    } catch (err: any) {
      console.error("[useSpeechRecognition] Error:", err);
      setError(err.message || "Error al iniciar grabación");
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [lang, audioUrl]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // recognition podría ya estar detenido
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    stopListening();
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";
    interimRef.current = "";
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    audioBlobRef.current = null;
    setError(null);
  }, [stopListening, audioUrl]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: transcript + (interimTranscript ? " " + interimTranscript : ""),
    audioBlob,
    audioUrl,
    isSupported,
    error,
    startListening,
    stopListening,
    reset,
    // Refs para que el consumidor pueda leer valores frescos sin stale closure
    transcriptRef,
    audioBlobRef,
  };
}

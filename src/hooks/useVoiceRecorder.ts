"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { blobToMp3 } from "@/lib/audio-encode";

export type VoiceRecorderState = "idle" | "recording" | "processing";

// Solo Firefox graba un formato que WhatsApp acepta tal cual (ogg/opus). El resto (Chrome, Safari) graba formatos
// distintos o ambiguos (p. ej. mp4 con opus), así que se convierten siempre a MP3, que es predecible en cualquier navegador.
const NATIVE_FORMAT = { recorderMime: "audio/ogg;codecs=opus", blobPrefix: "audio/ogg", extension: "ogg", fileType: "audio/ogg" } as const;

const MIC_ERROR = "No se pudo usar el micrófono. Revisa que el navegador tenga permiso.";
const PROCESS_ERROR = "No se pudo preparar la nota de voz. Intenta grabarla de nuevo.";

async function toWhatsAppFile(blob: Blob): Promise<File> {
  const name = `nota-de-voz-${Date.now()}`;
  if (blob.type.startsWith(NATIVE_FORMAT.blobPrefix)) {
    return new File([blob], `${name}.${NATIVE_FORMAT.extension}`, { type: NATIVE_FORMAT.fileType });
  }
  const mp3 = await blobToMp3(blob);
  return new File([mp3], `${name}.mp3`, { type: "audio/mpeg" });
}

/** Graba una nota de voz con el micrófono y la entrega como archivo listo para enviar por WhatsApp. */
export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Soltar el micrófono apaga el indicador rojo del navegador; si se queda abierto, parece que seguimos escuchando.
  const releaseMic = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => releaseMic, [releaseMic]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(NATIVE_FORMAT.recorderMime) ? { mimeType: NATIVE_FORMAT.recorderMime } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((current) => current + 1), 1000);
      setState("recording");
    } catch {
      releaseMic();
      setError(MIC_ERROR);
    }
  }, [state, releaseMic]);

  /** Termina la grabación y devuelve el archivo (o null si no hubo nada que guardar). */
  const stop = useCallback(
    () =>
      new Promise<File | null>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          resolve(null);
          return;
        }
        recorder.onstop = async () => {
          releaseMic();
          setState("processing");
          try {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            resolve(blob.size > 0 ? await toWhatsAppFile(blob) : null);
          } catch {
            setError(PROCESS_ERROR);
            resolve(null);
          } finally {
            recorderRef.current = null;
            setState("idle");
          }
        };
        recorder.stop();
      }),
    [releaseMic]
  );

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    releaseMic();
    setState("idle");
  }, [releaseMic]);

  return { state, seconds, error, start, stop, cancel };
}

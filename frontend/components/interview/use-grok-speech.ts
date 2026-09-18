"use client";

import { useCallback, useRef, useState } from "react";
import { transcribeAudio } from "@/lib/voice-api";

const MIME_CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export type VoiceInputState = "idle" | "recording" | "transcribing";

export function useGrokSpeech(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Микрофон недоступен. Напиши ответ текстом.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/mp4" });
        chunksRef.current = [];
        if (blob.size < 1200) {
          setState("idle");
          setError("Не расслышал — попробуй ещё раз или напиши текстом.");
          return;
        }
        setState("transcribing");
        const text = await transcribeAudio(blob);
        setState("idle");
        if (text) {
          setError(null);
          onTranscriptRef.current(text);
        } else {
          setError("Не удалось распознать речь. Попробуй ещё раз или напиши текстом.");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setError(null);
      setState("recording");
    } catch {
      setError("Нет доступа к микрофону. Разреши его или напиши ответ текстом.");
      setState("idle");
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle") void start();
  }, [state, start, stop]);

  const clearError = useCallback(() => setError(null), []);

  return { state, listening: state === "recording", transcribing: state === "transcribing", error, start, stop, toggle, clearError };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export type ContinuousVoicePhase = "off" | "listening" | "hearing" | "transcribing" | "paused";

export function useContinuousVoice({
  onUtterance,
  onBargeIn,
  paused,
  bargeIn,
  levelRef,
}: {
  onUtterance: (text: string) => void;
  onBargeIn?: () => void;
  paused: boolean;
  bargeIn: boolean;
  levelRef?: React.MutableRefObject<number>;
}) {
  const [micOn, setMicOn] = useState(false);
  const [phase, setPhase] = useState<ContinuousVoicePhase>("off");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingRef = useRef(false);
  const speechMsRef = useRef(0);
  const silenceMsRef = useRef(0);
  const noiseRef = useRef(0.012);
  const lastTsRef = useRef(0);
  const lastSampleRef = useRef(0);
  const pausedRef = useRef(paused);
  const bargeRef = useRef(bargeIn);
  const onUtteranceRef = useRef(onUtterance);
  const onBargeRef = useRef(onBargeIn);
  const processingRef = useRef(false);

  pausedRef.current = paused;
  bargeRef.current = bargeIn;
  onUtteranceRef.current = onUtterance;
  onBargeRef.current = onBargeIn;

  const stopRecorder = useCallback((cancel: boolean) => {
    const recorder = recorderRef.current;
    recordingRef.current = false;
    if (!recorder) return;
    if (recorder.state === "recording") {
      if (cancel) chunksRef.current = [];
      recorder.stop();
    }
  }, []);

  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/mp4" });
      chunksRef.current = [];
      recorderRef.current = null;
      if (!blob.size || blob.size < 1500) {
        setPhase(pausedRef.current ? "paused" : "listening");
        return;
      }
      processingRef.current = true;
      setPhase("transcribing");
      const text = await transcribeAudio(blob);
      processingRef.current = false;
      setPhase(pausedRef.current ? "paused" : "listening");
      if (text) onUtteranceRef.current(text);
    };

    recorderRef.current = recorder;
    recordingRef.current = true;
    silenceMsRef.current = 0;
    speechMsRef.current = 0;
    recorder.start();
    setPhase("hearing");
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Микрофон недоступен. Напиши ответ текстом.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);

      lastTsRef.current = performance.now();
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        const now = performance.now();
        if (now - lastSampleRef.current < 32) return;
        lastSampleRef.current = now;
        if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
        const dt = Math.min(120, now - lastTsRef.current);
        lastTsRef.current = now;

        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let index = 0; index < data.length; index += 1) sum += data[index] * data[index];
        const rms = Math.sqrt(sum / data.length);

        noiseRef.current =
          rms < noiseRef.current
            ? noiseRef.current * 0.94 + rms * 0.06
            : noiseRef.current * 0.998 + rms * 0.002;
        const threshold = Math.max(0.013, noiseRef.current * 2.1);
        const speaking = rms > threshold;

        if (levelRef) {
          const target = Math.min(1, rms / 0.11);
          levelRef.current = levelRef.current * 0.72 + target * 0.28;
        }

        if (pausedRef.current || processingRef.current) {
          if (recordingRef.current) stopRecorder(true);
          const bargeSpeaking = rms > threshold * 1.7;
          if (bargeRef.current && bargeSpeaking && !processingRef.current) {
            speechMsRef.current += dt;
            if (speechMsRef.current > 340) {
              speechMsRef.current = 0;
              onBargeRef.current?.();
            }
          } else {
            speechMsRef.current = 0;
          }
          setPhase((current) => (current === "paused" ? current : "paused"));
          return;
        }

        if (!recordingRef.current) {
          if (speaking) {
            speechMsRef.current += dt;
            if (speechMsRef.current > 140) startRecorder();
          } else {
            speechMsRef.current = 0;
          }
          setPhase((current) => (current === "listening" ? current : "listening"));
          return;
        }

        if (speaking) {
          silenceMsRef.current = 0;
          speechMsRef.current += dt;
        } else {
          silenceMsRef.current += dt;
        }
        if (silenceMsRef.current > 1150 || speechMsRef.current > 30000) {
          stopRecorder(false);
        }
      };

      rafRef.current = requestAnimationFrame(loop);
      setError(null);
      setMicOn(true);
      setPhase("listening");
    } catch {
      setError("Нет доступа к микрофону — разреши его или пиши текстом.");
      setMicOn(false);
      setPhase("off");
    }
  }, [startRecorder, stopRecorder]);

  const stop = useCallback(() => {
    stopRecorder(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    setMicOn(false);
    setPhase("off");
  }, [stopRecorder]);

  const toggle = useCallback(() => {
    if (micOn) stop();
    else void start();
  }, [micOn, start, stop]);

  useEffect(
    () => () => {
      stopRecorder(true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void ctxRef.current?.close().catch(() => undefined);
    },
    [stopRecorder],
  );

  const clearError = useCallback(() => setError(null), []);

  return { micOn, phase, error, start, stop, toggle, clearError };
}

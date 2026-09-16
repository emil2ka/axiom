"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechResultAlternative {
  transcript: string;
}

interface SpeechResult {
  readonly length: number;
  readonly isFinal: boolean;
  readonly [index: number]: SpeechResultAlternative;
}

interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResult;
}

interface SpeechEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}

interface SpeechErrorEvent {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Доступ к микрофону запрещён. Разреши его в настройках браузера.",
  "service-not-allowed": "Микрофон недоступен в этом браузере. Используй текстовый ввод.",
  "no-speech": "Не расслышал — скажи ещё раз или напиши текстом.",
  network: "Сервис распознавания недоступен. Напиши ответ текстом.",
  aborted: "",
};

export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Голосовой ввод доступен в Chrome. Используй текстовое поле.");
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    finalRef.current = "";
    setInterim("");
    setError(null);

    recognition.onresult = (event) => {
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalRef.current += `${transcript} `;
        else interimText += transcript;
      }
      setInterim(interimText.trim());
    };

    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error];
      if (message !== undefined && message !== "") setError(message);
      else if (message === undefined) setError("Не удалось распознать речь. Напиши ответ текстом.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (text) onFinalRef.current(text);
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError("Не удалось запустить микрофон. Попробуй ещё раз.");
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const clearError = useCallback(() => setError(null), []);

  return { supported, listening, interim, error, start, stop, toggle, clearError };
}

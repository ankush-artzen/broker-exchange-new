"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechLanguage } from "@/lib/types";

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
};

type RecognitionErrorEvent = {
  error: string;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => RecognitionInstance;

type Phase = "idle" | "starting" | "listening" | "stopping";

const MAX_RECORDING_MS = 60_000;
const START_TIMEOUT_MS = 8_000;
const STOP_FLUSH_MS = 2_000;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function speechLang(language: SpeechLanguage): string {
  if (language === "hinglish") return "hi-IN";
  return language;
}

function normalizeSpeech(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Drop a phrase that was copied onto itself, which mobile Chrome often does. */
function collapseRepeats(value: string): string {
  const words = normalizeSpeech(value).split(" ").filter(Boolean);
  if (words.length < 2) return words.join(" ");

  for (let size = Math.floor(words.length / 2); size >= 2; size -= 1) {
    if (words.length % size !== 0 || words.length / size < 2) continue;
    const unit = words.slice(0, size).map((word) => word.toLowerCase());
    const repeated = words.every(
      (word, index) => word.toLowerCase() === unit[index % size],
    );
    if (repeated) return words.slice(0, size).join(" ");
  }

  return words.join(" ");
}

/** Join heard text without repeating a phrase the browser already sent. */
function appendUnique(base: string, next: string): string {
  const a = collapseRepeats(base);
  const b = collapseRepeats(next);
  if (!b) return a;
  if (!a) return b;

  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl || al.endsWith(` ${bl}`) || al.endsWith(bl)) return a;
  if (bl.startsWith(al)) return b;

  const aWords = al.split(" ");
  const bWords = bl.split(" ");
  const bOriginal = b.split(" ");
  const max = Math.min(aWords.length, bWords.length);
  for (let count = max; count > 0; count -= 1) {
    const same = aWords.slice(-count).every((word, index) => word === bWords[index]);
    if (!same) continue;
    const rest = bOriginal.slice(count).join(" ");
    return rest ? `${a} ${rest}` : a;
  }

  return `${a} ${b}`;
}

function freshInterim(committed: string, interim: string): string {
  const combined = appendUnique(committed, interim);
  const base = normalizeSpeech(committed);
  if (!combined || combined.toLowerCase() === base.toLowerCase()) return "";
  if (base && combined.toLowerCase().startsWith(base.toLowerCase())) {
    return combined.slice(base.length).trim();
  }
  return normalizeSpeech(interim);
}

function errorMessage(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "Allow microphone access to speak a lead.";
  }
  if (code === "audio-capture") {
    return "No microphone found. Check the mic and try again.";
  }
  if (code === "language-not-supported") {
    return "This browser can't transcribe that language. Try another, or type the lead.";
  }
  if (code === "network") {
    return "Speech service is unavailable. Check your connection and try again.";
  }
  return "Couldn't hear the microphone. Try again.";
}

function detach(recognition: RecognitionInstance | null) {
  if (!recognition) return;
  recognition.onstart = null;
  recognition.onaudiostart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.abort();
  } catch {
    try {
      recognition.stop();
    } catch {
      // already stopped
    }
  }
}

export function useSpeechRecognition(language: SpeechLanguage) {
  const [transcript, setTranscriptState] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const languageRef = useRef(language);
  const transcriptRef = useRef("");
  const sessionBaseRef = useRef("");
  const sessionFinalRef = useRef("");
  const sessionInterimRef = useRef("");
  const wantRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const epochRef = useRef(0);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const sessionStartedAtRef = useRef(0);
  const recentEndsRef = useRef<number[]>([]);
  const networkFailuresRef = useRef(0);
  const liveRef = useRef(false);
  const stopResolveRef = useRef<((text: string) => void) | null>(null);
  const stopPromiseRef = useRef<Promise<string> | null>(null);
  const limitTimerRef = useRef<number | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const beginRef = useRef<
    (epoch: number, isRestart: boolean, retry: number) => void
  >(() => {});

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    setSupported(!!recognitionConstructor());
  }, []);

  const clearLimitTimer = useCallback(() => {
    if (limitTimerRef.current !== null) {
      window.clearTimeout(limitTimerRef.current);
      limitTimerRef.current = null;
    }
  }, []);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current !== null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const publish = useCallback(() => {
    const committed = appendUnique(sessionBaseRef.current, sessionFinalRef.current);
    transcriptRef.current = committed;
    setTranscriptState(committed);
    setInterim(freshInterim(committed, sessionInterimRef.current));
  }, []);

  const commitHeard = useCallback(() => {
    const text = appendUnique(
      appendUnique(sessionBaseRef.current, sessionFinalRef.current),
      sessionInterimRef.current,
    );
    sessionBaseRef.current = text;
    sessionFinalRef.current = "";
    sessionInterimRef.current = "";
    transcriptRef.current = text;
    setTranscriptState(text);
    setInterim("");
    return text;
  }, []);

  const settle = useCallback((text: string) => {
    phaseRef.current = "idle";
    wantRef.current = false;
    liveRef.current = false;
    setListening(false);
    setStarting(false);
    setProcessing(false);
    clearLimitTimer();
    clearStartTimer();
    clearStopTimer();
    const resolve = stopResolveRef.current;
    stopResolveRef.current = null;
    stopPromiseRef.current = null;
    resolve?.(text);
  }, [clearLimitTimer, clearStartTimer, clearStopTimer]);

  const fail = useCallback(
    (message: string) => {
      const text = commitHeard();
      const current = recognitionRef.current;
      recognitionRef.current = null;
      detach(current);
      setError(message);
      settle(text);
    },
    [commitHeard, settle],
  );

  const finishStop = useCallback(() => {
    const text = commitHeard();
    settle(text);
  }, [commitHeard, settle]);

  beginRef.current = (epoch, isRestart, retry) => {
    if (epoch !== epochRef.current || !wantRef.current) return;
    if (phaseRef.current === "stopping") return;
    if (recognitionRef.current) return;

    const Ctor = recognitionConstructor();
    if (!Ctor) {
      setSupported(false);
      fail("Voice is not supported in this browser. Type the lead instead.");
      return;
    }

    if (
      sessionStartedAtRef.current &&
      Date.now() - sessionStartedAtRef.current >= MAX_RECORDING_MS
    ) {
      setNotice("Recording stopped after 60 seconds. Your words were kept.");
      finishStop();
      return;
    }

    const recognition = new Ctor();
    recognition.lang = speechLang(languageRef.current);
    // Keep one session open. continuous:false makes Chrome end it and play the
    // mic-off sound as soon as you pause, which sounds like the mic stopped.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    phaseRef.current = "starting";
    liveRef.current = false;
    setStarting(true);
    setProcessing(false);

    let sawStart = false;
    let lastError = "";

    const markStarted = () => {
      if (epoch !== epochRef.current || recognitionRef.current !== recognition) return;
      if (!wantRef.current || phaseRef.current === "stopping") return;
      if (sawStart) return;
      sawStart = true;
      liveRef.current = true;
      networkFailuresRef.current = 0;
      phaseRef.current = "listening";
      setStarting(false);
      setListening(true);
      clearStartTimer();
    };

    recognition.onstart = markStarted;
    recognition.onaudiostart = markStarted;

    recognition.onresult = (event) => {
      if (epoch !== epochRef.current || recognitionRef.current !== recognition) return;
      if (phaseRef.current === "stopping") {
        // keep collecting; the final result often arrives after stop()
      } else if (!wantRef.current) {
        return;
      } else if (!sawStart) {
        markStarted();
      }
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText = appendUnique(finalText, piece);
        else interimText = appendUnique(interimText, piece);
      }
      sessionFinalRef.current = finalText;
      sessionInterimRef.current = interimText;
      publish();
    };

    recognition.onerror = (event) => {
      if (epoch !== epochRef.current || recognitionRef.current !== recognition) return;
      lastError = event.error || "";
      if (phaseRef.current === "stopping" || !wantRef.current) return;
      if (lastError === "no-speech" || lastError === "aborted") return;

      const fatal =
        lastError === "not-allowed" ||
        lastError === "service-not-allowed" ||
        lastError === "audio-capture" ||
        lastError === "language-not-supported";
      if (fatal) {
        fail(errorMessage(lastError));
        return;
      }

      if (lastError === "network") {
        networkFailuresRef.current += 1;
        if (networkFailuresRef.current >= 3) {
          fail(errorMessage("network"));
        }
        return;
      }

      // A non-fatal error ends this engine session. onend continues it
      // while the user still wants the mic, instead of cutting the mic off.
      if (sawStart || wantRef.current) return;
      fail(errorMessage(lastError));
    };

    recognition.onend = () => {
      if (epoch !== epochRef.current || recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      clearStartTimer();
      commitHeard();

      if (phaseRef.current === "stopping" || !wantRef.current) {
        finishStop();
        return;
      }

      // The browser closed this listen on its own and plays the mic-off sound.
      // Keep the button on. Resume after this session has fully released the mic.
      if (!sawStart && lastError && lastError !== "no-speech" && lastError !== "aborted" && lastError !== "network") {
        fail(errorMessage(lastError));
        return;
      }

      const now = Date.now();
      const recent = recentEndsRef.current.filter((at) => now - at < 2000);
      recent.push(now);
      recentEndsRef.current = recent;
      if (recent.length >= 3) {
        fail("The microphone stopped unexpectedly. Tap it to try again.");
        return;
      }

      // Don't call start() inside onend. Chrome treats that as another stop
      // and plays the mic-off sound again. Keep the button on and resume once.
      phaseRef.current = "listening";
      setListening(true);
      setStarting(false);
      window.setTimeout(() => {
        if (epoch !== epochRef.current || !wantRef.current) return;
        if (phaseRef.current === "stopping") return;
        if (recognitionRef.current) return;
        beginRef.current(epoch, true, 0);
      }, 350);
    };

    clearStartTimer();
    startTimerRef.current = window.setTimeout(() => {
      if (epoch !== epochRef.current || recognitionRef.current !== recognition) return;
      if (sawStart || !wantRef.current) return;
      fail("Couldn't start the microphone. Allow microphone access and try again.");
    }, START_TIMEOUT_MS);

    try {
      recognition.start();
    } catch (err) {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      clearStartTimer();
      const name = err instanceof DOMException ? err.name : "";
      const message = err instanceof Error ? err.message : "";
      const busy = name === "InvalidStateError" || /already started/i.test(message);
      // The previous engine can still own the mic for a moment after onend.
      if (busy && retry < 1 && wantRef.current && epoch === epochRef.current) {
        setStarting(true);
        window.setTimeout(() => {
          if (epoch !== epochRef.current || !wantRef.current) return;
          if (recognitionRef.current) return;
          beginRef.current(epoch, isRestart, retry + 1);
        }, 200);
        return;
      }
      if (isRestart && transcriptRef.current) {
        setNotice("Microphone stopped. Tap it to continue.");
        finishStop();
        return;
      }
      fail("Couldn't start the microphone. Try again.");
    }
  };

  const stop = useCallback(
    (options?: { discard?: boolean }) => {
      if (options?.discard) {
        epochRef.current += 1;
        wantRef.current = false;
        phaseRef.current = "idle";
        const current = recognitionRef.current;
        recognitionRef.current = null;
        detach(current);
        clearLimitTimer();
        clearStartTimer();
        clearStopTimer();
        setListening(false);
        setStarting(false);
        setProcessing(false);
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        stopPromiseRef.current = null;
        resolve?.(transcriptRef.current);
        return Promise.resolve(transcriptRef.current);
      }

      if (phaseRef.current === "stopping" && stopPromiseRef.current) {
        return stopPromiseRef.current;
      }

      if (!wantRef.current && phaseRef.current === "idle" && !recognitionRef.current) {
        setListening(false);
        setStarting(false);
        setProcessing(false);
        return Promise.resolve(transcriptRef.current);
      }

      wantRef.current = false;
      clearLimitTimer();
      clearStartTimer();

      const recognition = recognitionRef.current;
      if (!recognition || !liveRef.current) {
        recognitionRef.current = null;
        detach(recognition);
        finishStop();
        return Promise.resolve(transcriptRef.current);
      }

      phaseRef.current = "stopping";
      setStarting(false);
      setListening(false);
      setProcessing(true);

      const promise = new Promise<string>((resolve) => {
        stopResolveRef.current = resolve;
      });
      stopPromiseRef.current = promise;

      try {
        // stop() flushes the final result. abort() would drop it.
        recognition.stop();
      } catch {
        const current = recognitionRef.current;
        recognitionRef.current = null;
        detach(current);
        finishStop();
        return Promise.resolve(transcriptRef.current);
      }

      if (phaseRef.current === "stopping") {
        clearStopTimer();
        stopTimerRef.current = window.setTimeout(() => {
          if (phaseRef.current !== "stopping") return;
          const current = recognitionRef.current;
          recognitionRef.current = null;
          detach(current);
          finishStop();
        }, STOP_FLUSH_MS);
      }

      return promise;
    },
    [clearLimitTimer, clearStartTimer, clearStopTimer, finishStop],
  );

  const start = useCallback(
    (options?: { fresh?: boolean }): Promise<string> => {
      const Ctor = recognitionConstructor();
      if (!Ctor) {
        setSupported(false);
        setError("Voice is not supported in this browser. Type the lead instead.");
        return Promise.resolve("");
      }

      if (
        !options?.fresh &&
        wantRef.current &&
        (phaseRef.current === "starting" || phaseRef.current === "listening")
      ) {
        return Promise.resolve(transcriptRef.current);
      }

      if (phaseRef.current === "stopping" && stopPromiseRef.current) {
        const waitedEpoch = epochRef.current;
        return stopPromiseRef.current.then(() => {
          if (epochRef.current !== waitedEpoch) return transcriptRef.current;
          return start(options);
        });
      }

      if (options?.fresh) {
        sessionBaseRef.current = "";
        sessionFinalRef.current = "";
        sessionInterimRef.current = "";
        transcriptRef.current = "";
        setTranscriptState("");
        setInterim("");
      } else {
        sessionBaseRef.current = transcriptRef.current;
        sessionFinalRef.current = "";
        sessionInterimRef.current = "";
      }

      epochRef.current += 1;
      const epoch = epochRef.current;
      const previous = recognitionRef.current;
      recognitionRef.current = null;
      detach(previous);

      wantRef.current = true;
      phaseRef.current = "starting";
      sessionStartedAtRef.current = Date.now();
      recentEndsRef.current = [];
      networkFailuresRef.current = 0;
      setError("");
      setNotice("");
      setStarting(true);
      setListening(false);
      setProcessing(false);

      clearLimitTimer();
      limitTimerRef.current = window.setTimeout(() => {
        if (!wantRef.current || epoch !== epochRef.current) return;
        setNotice("Recording stopped after 60 seconds. Your words were kept.");
        void stop();
      }, MAX_RECORDING_MS);

      beginRef.current(epoch, false, 0);
      return Promise.resolve(transcriptRef.current);
    },
    [clearLimitTimer, stop],
  );

  const setTranscript = useCallback(
    (value?: string) => {
      const next = value ?? "";
      sessionBaseRef.current = next;
      sessionFinalRef.current = "";
      sessionInterimRef.current = "";
      transcriptRef.current = next;
      setTranscriptState(next);
      setInterim("");
    },
    [],
  );

  const clearError = useCallback(() => setError(""), []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!wantRef.current || phaseRef.current === "stopping") return;
      if (recognitionRef.current) return;
      beginRef.current(epochRef.current, true, 0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    return () => {
      epochRef.current += 1;
      wantRef.current = false;
      phaseRef.current = "idle";
      const current = recognitionRef.current;
      recognitionRef.current = null;
      detach(current);
      clearLimitTimer();
      clearStartTimer();
      clearStopTimer();
    };
  }, [clearLimitTimer, clearStartTimer, clearStopTimer]);

  return {
    transcript,
    interim,
    listening,
    starting,
    processing,
    supported,
    error,
    notice,
    clearError,
    start,
    stop,
    setTranscript,
  };
}

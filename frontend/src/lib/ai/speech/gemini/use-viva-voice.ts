"use client";

import {
  GoogleGenAI,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Real-time viva voice session against the Gemini Live API.
 *
 * Transport: WebSocket via @google/genai using a server-minted ephemeral
 * token (the real API key never reaches the browser; model + examiner
 * system prompt are locked server-side in the token's constraints).
 *
 * Audio: mic → AudioWorklet at the device rate → downsampled to 16kHz PCM16
 * → sendRealtimeInput; model audio arrives as base64 PCM@24kHz and is
 * schedule-played through a second AudioContext. Both contexts are created
 * inside the start tap, because iOS only lets audio start from a gesture.
 *
 * Each session has a time limit from the server (the student's remaining
 * voice minutes, at most 15); the hook ends the session when it's reached. Transcripts for both sides stream in via
 * input/outputTranscription and accumulate into an ordered turn list.
 */

export interface VivaTurn {
  role: "examiner" | "student";
  text: string;
}

export interface VivaRubricView {
  criteria: { name: string; score: number; comment: string }[];
  overallScore: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export type VivaStatus =
  | "idle"
  | "connecting"
  | "active"
  | "scoring"
  | "completed"
  | "error";

import { base64ToFloat32, floatTo16BitPcmBase64 } from "./pcm";
import { PcmDownsampler, createCaptureNode } from "./resampler";

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

export function useVivaVoice() {
  const [status, setStatus] = useState<VivaStatus>("idle");
  const [turns, setTurns] = useState<VivaTurn[]>([]);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rubric, setRubric] = useState<VivaRubricView | null>(null);
  const [mode, setMode] = useState<"viva" | "tutor">("viva");
  /** The chat thread the finished session was saved to */
  const [threadId, setThreadId] = useState<string | null>(null);
  /** When this session's time runs out (ms epoch), while one is running */
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [course, setCourse] = useState<{
    courseCode: string;
    title: string;
  } | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const vivaIdRef = useRef<string | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const captureRef = useRef<AudioWorkletNode | null>(null);
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True from "active" until end() starts, so a socket close can end it */
  const liveRef = useRef(false);
  /** Set once end() runs, so it can't run twice for one session */
  const endingRef = useRef(false);
  const endRef = useRef<(abandoned?: boolean) => Promise<void>>(async () => {});
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // Streaming transcript buffers — flushed into `turns` at turn boundaries.
  const studentBufferRef = useRef("");
  const examinerBufferRef = useRef("");
  const turnsRef = useRef<VivaTurn[]>([]);

  const pushTurn = useCallback((role: VivaTurn["role"], text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    turnsRef.current = [...turnsRef.current, { role, text: trimmed }];
    setTurns(turnsRef.current);
  }, []);

  const stopPlayback = useCallback(() => {
    for (const source of playingSourcesRef.current) {
      try {
        source.stop();
      } catch {}
    }
    playingSourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
    setIsExaminerSpeaking(false);
  }, []);

  const playAudioChunk = useCallback((base64: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    const samples = base64ToFloat32(base64);
    if (samples.length === 0) return;
    const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    playingSourcesRef.current.add(source);
    setIsExaminerSpeaking(true);
    source.onended = () => {
      playingSourcesRef.current.delete(source);
      if (playingSourcesRef.current.size === 0) setIsExaminerSpeaking(false);
    };
  }, []);

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (!content) return;

      // The candidate's words: flush into a turn once the examiner replies.
      if (content.inputTranscription?.text) {
        studentBufferRef.current += content.inputTranscription.text;
      }
      if (content.outputTranscription?.text) {
        if (studentBufferRef.current) {
          pushTurn("student", studentBufferRef.current);
          studentBufferRef.current = "";
        }
        examinerBufferRef.current += content.outputTranscription.text;
      }

      const audioData = content.modelTurn?.parts?.find(
        (p) => p.inlineData?.data,
      )?.inlineData?.data;
      if (audioData) playAudioChunk(audioData);

      // The candidate spoke over the examiner — stop playback immediately.
      if (content.interrupted) {
        stopPlayback();
        if (examinerBufferRef.current) {
          pushTurn("examiner", examinerBufferRef.current);
          examinerBufferRef.current = "";
        }
      }
      if (content.turnComplete && examinerBufferRef.current) {
        pushTurn("examiner", examinerBufferRef.current);
        examinerBufferRef.current = "";
      }
    },
    [playAudioChunk, pushTurn, stopPlayback],
  );

  const teardownAudio = useCallback(() => {
    if (limitTimerRef.current) clearTimeout(limitTimerRef.current);
    limitTimerRef.current = null;
    setEndsAt(null);
    if (captureRef.current) {
      captureRef.current.port.onmessage = null;
      captureRef.current.disconnect();
    }
    captureRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    inputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;
    stopPlayback();
    outputCtxRef.current?.close().catch(() => {});
    outputCtxRef.current = null;
  }, [stopPlayback]);

  const start = useCallback(
    async (
      courseId: string,
      focusTopic?: string,
      sessionMode: "viva" | "tutor" = "viva",
    ) => {
      // Create the audio contexts now, inside the tap (iOS needs a gesture)
      const outputCtx = new AudioContext();
      const inputCtx = new AudioContext();
      outputCtxRef.current = outputCtx;
      inputCtxRef.current = inputCtx;
      void outputCtx.resume();
      void inputCtx.resume();

      endingRef.current = false;
      setStatus("connecting");
      setMode(sessionMode);
      setError(null);
      setRubric(null);
      turnsRef.current = [];
      setTurns([]);
      studentBufferRef.current = "";
      examinerBufferRef.current = "";
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        // Mic first, then the worklet: if either fails, no session is opened.
        // Mic → worklet (device rate) → 16kHz PCM16 → Live API
        const source = inputCtx.createMediaStreamSource(micStreamRef.current);
        const capture = await createCaptureNode(inputCtx);
        captureRef.current = capture;
        const downsampler = new PcmDownsampler(
          inputCtx.sampleRate,
          INPUT_SAMPLE_RATE,
        );
        const mimeType = `audio/pcm;rate=${downsampler.outRate}`;
        capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
          if (!sessionRef.current) return;
          const pcm = downsampler.process(event.data);
          if (pcm.length === 0) return;
          sessionRef.current.sendRealtimeInput({
            audio: { data: floatTo16BitPcmBase64(pcm), mimeType },
          });
        };
        // The worklet has to sit in a graph that reaches the speakers to be
        // run; a muted gain keeps the mic out of them
        const mute = inputCtx.createGain();
        mute.gain.value = 0;
        source.connect(capture);
        capture.connect(mute);
        mute.connect(inputCtx.destination);

        const res = await fetch("/api/student/viva/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, focusTopic, mode: sessionMode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to start viva session");
        }
        vivaIdRef.current = data.sessionId;
        setCourse(data.course ?? null);

        const ai = new GoogleGenAI({
          apiKey: data.token,
          httpOptions: { apiVersion: "v1alpha" },
        });
        const session = await ai.live.connect({
          model: data.model,
          // Model, modalities and system prompt are locked in the token's
          // constraints server-side; nothing to configure here.
          config: {},
          callbacks: {
            onmessage: handleMessage,
            onerror: (e: ErrorEvent) => {
              setError(e.message || "Voice connection error");
              setStatus("error");
            },
            onclose: () => {
              setIsExaminerSpeaking(false);
              // The connection dropped (or the token ran out) mid-session:
              // save what was said rather than leaving a dead session open
              if (liveRef.current) void endRef.current(false);
            },
          },
        });
        sessionRef.current = session;

        // Ended while still connecting: don't go live
        if (endingRef.current) throw new Error("cancelled");

        const limitSeconds = Number(data.limitSeconds) || 15 * 60;
        setEndsAt(Date.now() + limitSeconds * 1000);
        limitTimerRef.current = setTimeout(() => {
          void endRef.current(false);
        }, limitSeconds * 1000);

        liveRef.current = true;
        setStatus("active");
      } catch (err) {
        teardownAudio();
        sessionRef.current?.close();
        sessionRef.current = null;
        // A session row was opened (e.g. then the mic was refused): close it
        // so it doesn't count against the student's minutes
        const openId = vivaIdRef.current;
        vivaIdRef.current = null;
        if (openId) {
          void fetch(`/api/student/viva/${openId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: [], abandoned: true }),
          }).catch(() => {});
        }
        if (endingRef.current) {
          setStatus("idle");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to start viva");
        setStatus("error");
      }
    },
    [handleMessage, teardownAudio],
  );

  /** End the viva: close the live session, then grade the transcript. */
  const end = useCallback(
    async (abandoned = false) => {
      if (endingRef.current) return;
      endingRef.current = true;
      liveRef.current = false;
      // Flush any partial buffers so the grader sees the full exchange.
      if (studentBufferRef.current) {
        pushTurn("student", studentBufferRef.current);
        studentBufferRef.current = "";
      }
      if (examinerBufferRef.current) {
        pushTurn("examiner", examinerBufferRef.current);
        examinerBufferRef.current = "";
      }
      teardownAudio();
      sessionRef.current?.close();
      sessionRef.current = null;

      const vivaId = vivaIdRef.current;
      if (!vivaId) {
        setStatus("idle");
        return;
      }
      setStatus("scoring");
      try {
        const res = await fetch(`/api/student/viva/${vivaId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: turnsRef.current, abandoned }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Grading failed");
        setRubric(data.rubric ?? null);
        setThreadId(data.threadId ?? null);
        // A graded viva shows its rubric; a tutor session shows its recap
        setStatus(data.status === "completed" ? "completed" : "idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Grading failed");
        setStatus("error");
      } finally {
        vivaIdRef.current = null;
      }
    },
    [pushTurn, teardownAudio],
  );
  endRef.current = end;

  // Closing or leaving the tab mid-session: close the session server-side
  // so the minutes stop counting (sendBeacon survives the page going away)
  useEffect(() => {
    const onPageHide = () => {
      const vivaId = vivaIdRef.current;
      if (!liveRef.current || !vivaId) return;
      liveRef.current = false;
      navigator.sendBeacon(
        `/api/student/viva/${vivaId}/complete`,
        new Blob(
          [JSON.stringify({ transcript: turnsRef.current, abandoned: true })],
          { type: "application/json" },
        ),
      );
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      // Navigating away inside the app: same, and let go of the mic
      window.removeEventListener("pagehide", onPageHide);
      onPageHide();
      sessionRef.current?.close();
      sessionRef.current = null;
      teardownAudio();
    };
  }, [teardownAudio]);

  const reset = useCallback(() => {
    teardownAudio();
    sessionRef.current?.close();
    sessionRef.current = null;
    vivaIdRef.current = null;
    turnsRef.current = [];
    setTurns([]);
    setRubric(null);
    setThreadId(null);
    setError(null);
    setCourse(null);
    setStatus("idle");
  }, [teardownAudio]);

  return {
    status,
    turns,
    isExaminerSpeaking,
    error,
    rubric,
    mode,
    course,
    threadId,
    endsAt,
    start,
    end,
    reset,
  };
}

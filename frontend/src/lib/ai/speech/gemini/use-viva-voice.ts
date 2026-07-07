"use client";

import {
  GoogleGenAI,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { useCallback, useRef, useState } from "react";

/**
 * Real-time viva voice session against the Gemini Live API.
 *
 * Transport: WebSocket via @google/genai using a server-minted ephemeral
 * token (the real API key never reaches the browser; model + examiner
 * system prompt are locked server-side in the token's constraints).
 *
 * Audio: mic → AudioContext@16kHz → PCM16 chunks → sendRealtimeInput;
 * model audio arrives as base64 PCM@24kHz and is schedule-played through
 * a second AudioContext. Transcripts for both sides stream in via
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

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

function floatTo16BitPcmBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;
  return float32;
}

export function useVivaVoice() {
  const [status, setStatus] = useState<VivaStatus>("idle");
  const [turns, setTurns] = useState<VivaTurn[]>([]);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rubric, setRubric] = useState<VivaRubricView | null>(null);
  const [course, setCourse] = useState<{
    courseCode: string;
    title: string;
  } | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const vivaIdRef = useRef<string | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
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
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    inputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;
    stopPlayback();
    outputCtxRef.current?.close().catch(() => {});
    outputCtxRef.current = null;
  }, [stopPlayback]);

  const start = useCallback(
    async (courseId: string, focusTopic?: string) => {
      setStatus("connecting");
      setError(null);
      setRubric(null);
      turnsRef.current = [];
      setTurns([]);
      studentBufferRef.current = "";
      examinerBufferRef.current = "";
      try {
        const res = await fetch("/api/student/viva/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, focusTopic }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to start viva session");
        }
        vivaIdRef.current = data.sessionId;
        setCourse(data.course ?? null);

        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        outputCtxRef.current = new AudioContext({
          sampleRate: OUTPUT_SAMPLE_RATE,
        });

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
            },
          },
        });
        sessionRef.current = session;

        // Mic → 16kHz PCM16 → Live API. ScriptProcessor is deprecated but
        // dependency-free; the browser resamples to the context rate for us.
        const inputCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
        inputCtxRef.current = inputCtx;
        const source = inputCtx.createMediaStreamSource(micStreamRef.current);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (event) => {
          if (!sessionRef.current) return;
          const pcm = event.inputBuffer.getChannelData(0);
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: floatTo16BitPcmBase64(pcm),
              mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
            },
          });
        };
        source.connect(processor);
        processor.connect(inputCtx.destination);

        setStatus("active");
      } catch (err) {
        teardownAudio();
        sessionRef.current?.close();
        sessionRef.current = null;
        setError(err instanceof Error ? err.message : "Failed to start viva");
        setStatus("error");
      }
    },
    [handleMessage, teardownAudio],
  );

  /** End the viva: close the live session, then grade the transcript. */
  const end = useCallback(
    async (abandoned = false) => {
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
        setStatus(data.rubric ? "completed" : "idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Grading failed");
        setStatus("error");
      } finally {
        vivaIdRef.current = null;
      }
    },
    [pushTurn, teardownAudio],
  );

  const reset = useCallback(() => {
    teardownAudio();
    sessionRef.current?.close();
    sessionRef.current = null;
    vivaIdRef.current = null;
    turnsRef.current = [];
    setTurns([]);
    setRubric(null);
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
    course,
    start,
    end,
    reset,
  };
}

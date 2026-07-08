"use client";

import {
  GoogleGenAI,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { useCallback, useRef, useState } from "react";

import { base64ToFloat32, floatTo16BitPcmBase64 } from "./pcm";

/**
 * Live voice office hours with the course's AI professor.
 * Same transport + audio pipeline as the viva hook, but conversational:
 * no grading step, the session simply ends when the student hangs up.
 */

export interface OfficeHoursTurn {
  role: "professor" | "student";
  text: string;
}

export type OfficeHoursStatus = "idle" | "connecting" | "active" | "error";

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

export function useOfficeHoursVoice() {
  const [status, setStatus] = useState<OfficeHoursStatus>("idle");
  const [turns, setTurns] = useState<OfficeHoursTurn[]>([]);
  const [isProfessorSpeaking, setIsProfessorSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const studentBufferRef = useRef("");
  const professorBufferRef = useRef("");
  const turnsRef = useRef<OfficeHoursTurn[]>([]);

  const pushTurn = useCallback(
    (role: OfficeHoursTurn["role"], text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      turnsRef.current = [...turnsRef.current, { role, text: trimmed }];
      setTurns(turnsRef.current);
    },
    [],
  );

  const stopPlayback = useCallback(() => {
    for (const source of playingSourcesRef.current) {
      try {
        source.stop();
      } catch {}
    }
    playingSourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
    setIsProfessorSpeaking(false);
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
    setIsProfessorSpeaking(true);
    source.onended = () => {
      playingSourcesRef.current.delete(source);
      if (playingSourcesRef.current.size === 0) setIsProfessorSpeaking(false);
    };
  }, []);

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (!content) return;

      if (content.inputTranscription?.text) {
        studentBufferRef.current += content.inputTranscription.text;
      }
      if (content.outputTranscription?.text) {
        if (studentBufferRef.current) {
          pushTurn("student", studentBufferRef.current);
          studentBufferRef.current = "";
        }
        professorBufferRef.current += content.outputTranscription.text;
      }

      const audioData = content.modelTurn?.parts?.find(
        (p) => p.inlineData?.data,
      )?.inlineData?.data;
      if (audioData) playAudioChunk(audioData);

      if (content.interrupted) {
        stopPlayback();
        if (professorBufferRef.current) {
          pushTurn("professor", professorBufferRef.current);
          professorBufferRef.current = "";
        }
      }
      if (content.turnComplete && professorBufferRef.current) {
        pushTurn("professor", professorBufferRef.current);
        professorBufferRef.current = "";
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
    async (courseId: string) => {
      setStatus("connecting");
      setError(null);
      turnsRef.current = [];
      setTurns([]);
      studentBufferRef.current = "";
      professorBufferRef.current = "";
      try {
        const res = await fetch(
          `/api/student/professor/${courseId}/voice-token`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to start office hours");
        }

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
          // Model + persona are locked in the token's constraints server-side.
          config: {},
          callbacks: {
            onmessage: handleMessage,
            onerror: (e: ErrorEvent) => {
              setError(e.message || "Voice connection error");
              setStatus("error");
            },
            onclose: () => {
              setIsProfessorSpeaking(false);
            },
          },
        });
        sessionRef.current = session;

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
        setError(
          err instanceof Error ? err.message : "Failed to start office hours",
        );
        setStatus("error");
      }
    },
    [handleMessage, teardownAudio],
  );

  const end = useCallback(() => {
    if (studentBufferRef.current) {
      pushTurn("student", studentBufferRef.current);
      studentBufferRef.current = "";
    }
    if (professorBufferRef.current) {
      pushTurn("professor", professorBufferRef.current);
      professorBufferRef.current = "";
    }
    teardownAudio();
    sessionRef.current?.close();
    sessionRef.current = null;
    setStatus("idle");
  }, [pushTurn, teardownAudio]);

  return {
    status,
    turns,
    isProfessorSpeaking,
    error,
    start,
    end,
  };
}

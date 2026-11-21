"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A sentence takes a few seconds; stop by itself in case the learner forgets. */
export const MAX_RECORDING_MS = 20_000;

export const isRecordingSupported = (): boolean =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export interface RecorderApi {
  /** null until mounted. */
  supported: boolean | null;
  recording: boolean;
  /** The last recording as an object URL. It stays on this device and is never uploaded. */
  url: string | null;
  /** Resolves false when the microphone could not be opened (permission refused, no microphone). */
  start: () => Promise<boolean>;
  stop: () => void;
  clear: () => void;
}

/** Records the learner's voice with MediaRecorder so they can hear themselves next to the model sentence. */
export function useRecorder(): RecorderApi {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef = useRef<string | null>(null);
  const mounted = useRef(true);

  const setRecordingUrl = useCallback((next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setUrl(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    setSupported(isRecordingSupported());
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      const r = recorder.current;
      recorder.current = null;
      if (r && r.state !== "inactive") {
        r.ondataavailable = null;
        r.onstop = null;
        r.stop();
      }
      r?.stream.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const start = useCallback(async () => {
    if (!isRecordingSupported() || recorder.current) return false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return false;
    }
    if (!mounted.current) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    const r = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recorder.current === r) recorder.current = null;
      if (!mounted.current) return;
      setRecording(false);
      setRecordingUrl(chunks.length > 0 ? URL.createObjectURL(new Blob(chunks, { type: r.mimeType || chunks[0].type })) : null);
    };
    recorder.current = r;
    setRecordingUrl(null);
    r.start();
    setRecording(true);
    timer.current = setTimeout(stop, MAX_RECORDING_MS);
    return true;
  }, [setRecordingUrl, stop]);

  const clear = useCallback(() => setRecordingUrl(null), [setRecordingUrl]);

  return { supported, recording, url, start, stop, clear };
}

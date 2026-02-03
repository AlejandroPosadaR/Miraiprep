import { useCallback, useRef, useState } from "react";
import { api } from "@/services/api";

export type OpenAISpeechToTextState = {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
};

export type OpenAISpeechToTextControls = {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  reset: () => void;
};

export type UseOpenAISpeechToTextOptions = {
  language?: string;
  silenceTimeout?: number; // ms of silence before auto-stop (default: 2000)
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
};

/**
 * High-quality speech-to-text using OpenAI Whisper API via backend.
 * 
 * Records audio using MediaRecorder, detects silence, and sends
 * complete audio to backend for transcription.
 */
export function useOpenAISpeechToText(
  options: UseOpenAISpeechToTextOptions = {}
): OpenAISpeechToTextState & OpenAISpeechToTextControls {
  const { language = "en", silenceTimeout = 2000, onTranscript, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const processAudio = useCallback(async (): Promise<string> => {
    const chunks = audioChunksRef.current;
    if (chunks.length === 0) {
      return "";
    }

    setIsProcessing(true);
    setError(null);

    try {
      const audioBlob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
      
      if (audioBlob.size < 100) {
        console.warn("Audio too short, skipping transcription");
        return "";
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (language) {
        formData.append("language", language);
      }

      const result = await api.transcribeAudio(formData);
      const text = result.text?.trim() || "";
      
      if (text) {
        setTranscript(text);
        onTranscript?.(text);
      }
      
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transcription failed";
      setError(message);
      onError?.(message);
      return "";
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  }, [language, onTranscript, onError]);

  const stopRecording = useCallback(async (): Promise<string> => {
    clearSilenceTimer();
    stopAnalyser();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      return new Promise<string>((resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        recorder.onstop = async () => {
          setIsListening(false);
          
          // Stop all tracks
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          
          // Process the audio
          const text = await processAudio();
          resolve(text);
        };
        
        recorder.stop();
      });
    }

    setIsListening(false);
    return "";
  }, [clearSilenceTimer, stopAnalyser, processAudio]);

  const start = useCallback(async () => {
    if (isListening || isProcessing) return;

    setError(null);
    setTranscript("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Set up audio analysis for silence detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSoundTime = Date.now();

      const checkSilence = () => {
        if (!analyserRef.current || !isListening) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (average > 10) {
          // Sound detected
          lastSoundTime = Date.now();
          clearSilenceTimer();
        } else if (Date.now() - lastSoundTime > silenceTimeout) {
          // Silence detected for too long - auto stop
          void stopRecording();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(checkSilence);
      };

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording failed");
        setIsListening(false);
      };

      // Start recording with timeslice to collect chunks periodically
      recorder.start(250);
      setIsListening(true);

      // Start silence detection
      animationFrameRef.current = requestAnimationFrame(checkSilence);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      onError?.(message);
    }
  }, [isListening, isProcessing, silenceTimeout, clearSilenceTimer, stopRecording, onError]);

  const stop = useCallback(async (): Promise<string> => {
    return stopRecording();
  }, [stopRecording]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isSupported,
    isListening,
    isProcessing,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}

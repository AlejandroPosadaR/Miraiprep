import { useCallback, useEffect, useRef, useState } from "react";

export type UseCameraState = {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  stream: MediaStream | null;
};

export type UseCameraControls = {
  enable: () => Promise<void>;
  disable: () => void;
  toggle: () => Promise<void>;
};

export function useCamera(): UseCameraState & UseCameraControls {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const enable = useCallback(async () => {
    if (!isSupported) {
      setError("Camera not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsEnabled(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access camera";
      if (message.includes("NotAllowedError") || message.includes("Permission denied")) {
        setError("Camera permission denied. Please allow camera access.");
      } else if (message.includes("NotFoundError")) {
        setError("No camera found. Please connect a camera.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const disable = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsEnabled(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isEnabled) {
      disable();
    } else {
      await enable();
    }
  }, [isEnabled, enable, disable]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    error,
    stream,
    enable,
    disable,
    toggle,
  };
}

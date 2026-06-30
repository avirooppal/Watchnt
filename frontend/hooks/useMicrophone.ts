'use client';

import { useState, useCallback } from 'react';

export const useMicrophone = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Microphone permission denied");
    }
  }, []);

  return { stream, error, requestPermission };
};

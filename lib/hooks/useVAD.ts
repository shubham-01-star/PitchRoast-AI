'use client';

import { useRef, useCallback, useEffect } from 'react';

export interface VADConfig {
  silenceThresholdMs?: number;
  volumeThreshold?: number;
}

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export function useVAD(config: VADConfig = {}, callbacks: VADCallbacks = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const silenceThreshold = config.silenceThresholdMs || 1500;
  const volumeThreshold = config.volumeThreshold || 0.01;

  const startVAD = useCallback((stream: MediaStream) => {
    // Create audio context and analyser
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;

    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    // Start monitoring volume
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkVolume = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteTimeDomainData(dataArray);

      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      callbacks.onVolumeChange?.(rms);

      // Check if speaking
      if (rms > volumeThreshold) {
        // User is speaking
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          callbacks.onSpeechStart?.();
        }

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Start new silence timer
        silenceTimerRef.current = setTimeout(() => {
          if (isSpeakingRef.current) {
            isSpeakingRef.current = false;
            callbacks.onSpeechEnd?.();
          }
        }, silenceThreshold);
      }

      animationFrameRef.current = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }, [silenceThreshold, volumeThreshold, callbacks]);

  const stopVAD = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopVAD();
    };
  }, [stopVAD]);

  return {
    startVAD,
    stopVAD,
  };
}

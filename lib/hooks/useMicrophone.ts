'use client';

import { useState, useCallback, useRef } from 'react';

export interface MicrophoneState {
  stream: MediaStream | null;
  isPermissionGranted: boolean;
  isRequesting: boolean;
  error: string | null;
}

export function useMicrophone() {
  const [state, setState] = useState<MicrophoneState>({
    stream: null,
    isPermissionGranted: false,
    isRequesting: false,
    error: null,
  });
  
  const streamRef = useRef<MediaStream | null>(null);

  const requestPermission = useCallback(async () => {
    setState(prev => ({ ...prev, isRequesting: true, error: null }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      streamRef.current = stream;
      setState({
        stream,
        isPermissionGranted: true,
        isRequesting: false,
        error: null,
      });
      
      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.name === 'NotAllowedError'
          ? 'Microphone access is required for PitchRoast AI. Please enable microphone permissions in your browser settings.'
          : `Failed to access microphone: ${error.message}`
        : 'Failed to access microphone';
      
      setState({
        stream: null,
        isPermissionGranted: false,
        isRequesting: false,
        error: errorMessage,
      });
      
      throw new Error(errorMessage);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setState({
        stream: null,
        isPermissionGranted: false,
        isRequesting: false,
        error: null,
      });
    }
  }, []);

  return {
    ...state,
    requestPermission,
    stopStream,
  };
}

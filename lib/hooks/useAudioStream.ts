'use client';

import { useRef, useCallback } from 'react';

export interface AudioStreamConfig {
  sampleRate?: number;
  chunkDurationMs?: number;
}

export function useAudioStream(config: AudioStreamConfig = {}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const startCapture = useCallback((
    stream: MediaStream,
    onAudioChunk: (chunk: string) => void
  ) => {
    const sampleRate = config.sampleRate || 16000;
    
    // Create MediaRecorder for audio capture
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    
    mediaRecorderRef.current = mediaRecorder;
    
    // Capture audio in small chunks (20ms or less)
    const chunkDuration = config.chunkDurationMs || 20;
    
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        // Convert blob to base64 for WebSocket transmission
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          onAudioChunk(base64Data);
        };
        reader.readAsDataURL(event.data);
      }
    };
    
    mediaRecorder.start(chunkDuration);
  }, [config.sampleRate, config.chunkDurationMs]);

  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: config.sampleRate || 16000 });
    }
    
    const audioContext = audioContextRef.current;
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      audioQueueRef.current.push(audioBuffer);
      
      if (!isPlayingRef.current) {
        playNextInQueue();
      }
    } catch (error) {
      console.error('Failed to decode audio:', error);
    }
  }, [config.sampleRate]);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift()!;
    const audioContext = audioContextRef.current!;
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      playNextInQueue();
    };
    
    source.start();
  }, []);

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return {
    startCapture,
    stopCapture,
    playAudio,
    stopPlayback,
  };
}

'use client';

import { useRef, useCallback } from 'react';

export interface AudioStreamConfig {
  sampleRate?: number;
  chunkDurationMs?: number;
}

export function useAudioStream(config: AudioStreamConfig = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const outputContextRef = useRef<AudioContext | null>(null);

  const startCapture = useCallback((
    stream: MediaStream,
    onAudioChunk: (chunk: string) => void
  ) => {
    const sampleRate = config.sampleRate || 16000;

    // Use AudioContext + ScriptProcessor to capture raw PCM at 16kHz
    const audioContext = new AudioContext({ sampleRate });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    // bufferSize 4096 = ~256ms at 16kHz; gives ~62 chunks/sec
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0); // Float32Array [-1, 1]

      // Convert Float32 PCM to Int16 PCM
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Base64 encode the raw Int16 PCM bytes
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      onAudioChunk(base64);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [config.sampleRate]);

  const stopCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    if (!outputContextRef.current) {
      outputContextRef.current = new AudioContext({ sampleRate: config.sampleRate || 16000 });
    }

    const audioContext = outputContextRef.current;

    try {
      // audioData is raw Int16 LPCM — decode manually
      const int16 = new Int16Array(audioData);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioContext.createBuffer(1, float32.length, audioContext.sampleRate);
      audioBuffer.copyToChannel(float32, 0);
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
    const audioContext = outputContextRef.current!;

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
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
  }, []);

  return {
    startCapture,
    stopCapture,
    playAudio,
    stopPlayback,
  };
}

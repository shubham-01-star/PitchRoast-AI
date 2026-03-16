'use client';

import { useState, useEffect } from 'react';
import { useMicrophone } from '@/lib/hooks/useMicrophone';
import { useWebRTC } from '@/lib/hooks/useWebRTC';
import { useAudioStream } from '@/lib/hooks/useAudioStream';
import { useVAD } from '@/lib/hooks/useVAD';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [isOverLimit, setIsOverLimit] = useState(false);
  
  const { 
    stream, 
    isPermissionGranted, 
    isRequesting, 
    error: micError, 
    requestPermission, 
    stopStream 
  } = useMicrophone();
  
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  const { status, error: wsError, connect, disconnect } = useWebRTC({ wsUrl });
  
  const { startCapture, stopCapture, playAudio, stopPlayback } = useAudioStream({
    sampleRate: 16000,
    chunkDurationMs: 20,
  });
  
  const { startVAD, stopVAD } = useVAD(
    { silenceThresholdMs: 1500, volumeThreshold: 0.01 },
    {
      onSpeechStart: () => {
        console.log('Speech started');
      },
      onSpeechEnd: () => {
        console.log('Speech ended');
      },
    }
  );

  const checkDailyUsage = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/usage/check`);
      if (response.ok) {
        const data = await response.json();
        setIsOverLimit(data.isOverLimit);
      }
    } catch (error) {
      console.error('Failed to check usage:', error);
    }
  };

  // Check daily usage on mount
  useEffect(() => {
    checkDailyUsage();
  }, []);

  const handleStartPitch = async () => {
    try {
      // Request microphone permission
      const mediaStream = await requestPermission();

      // Connect to WebSocket — waits for onopen before resolving
      const ws = await connect(mediaStream);

      // Start audio capture (WebSocket is guaranteed open here)
      startCapture(mediaStream, (audioChunk) => {
        ws.send(JSON.stringify({
          type: 'audio',
          payload: audioChunk,
          timestamp: Date.now(),
        }));
      });

      // Start VAD
      startVAD(mediaStream);

      // Handle incoming messages
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'status' && message.payload.sessionId) {
          setSessionId(message.payload.sessionId);
          localStorage.setItem('pitchroast_session_id', message.payload.sessionId);
          localStorage.setItem('pitchroast_session_expiry',
            String(Date.now() + 90 * 24 * 60 * 60 * 1000));
        }

        if (message.type === 'audio' && message.payload.audio) {
          // Decode base64 LPCM Int16 audio from Bedrock
          const binary = atob(message.payload.audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          playAudio(bytes.buffer);
        }
      };

      // Start countdown timer
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleEndPitch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start pitch:', error);
    }
  };

  const handleEndPitch = () => {
    stopCapture();
    stopVAD();
    stopPlayback();
    stopStream();
    disconnect();
    setTimeRemaining(120);
  };

  const getStatusMessage = () => {
    if (status === 'connecting') return 'Connecting...';
    if (status === 'connected') return 'Connected - Start speaking!';
    if (status === 'error') return wsError || 'Connection error';
    if (status === 'disconnected') return 'Disconnected';
    return 'Ready to start';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
      <main className="flex flex-col items-center gap-8 p-8 max-w-2xl">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            PitchRoast AI
          </h1>
          <p className="text-xl text-zinc-400 mb-2">
            Practice your startup pitch with a brutal VC investor
          </p>
          <p className="text-sm text-zinc-500">
            2-minute mock call • Real-time feedback • Get roasted
          </p>
        </div>

        {micError && (
          <div className="bg-red-900/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg max-w-md">
            {micError}
          </div>
        )}

        {wsError && (
          <div className="bg-red-900/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg max-w-md">
            {wsError}
          </div>
        )}

        {isOverLimit && (
          <div className="bg-yellow-900/20 border border-yellow-500 text-yellow-200 px-6 py-4 rounded-lg max-w-md text-center">
            System is currently in maintenance mode due to high usage. Please try again later.
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {status === 'idle' ? (
            <button
              onClick={handleStartPitch}
              disabled={isRequesting || isOverLimit}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              {isRequesting ? 'Requesting permission...' : isOverLimit ? 'Maintenance Mode' : 'Start Pitch'}
            </button>
          ) : (
            <>
              <div className={`text-6xl font-bold ${timeRemaining < 30 ? 'text-red-500' : 'text-white'}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-zinc-400 text-sm">
                {getStatusMessage()}
              </div>
              <button
                onClick={handleEndPitch}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                End Call
              </button>
            </>
          )}
        </div>

        {sessionId && status === 'idle' && (
          <div className="text-center">
            <a
              href="/dashboard"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              View your roast reports →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

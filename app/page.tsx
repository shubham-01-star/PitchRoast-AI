'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useMicrophone } from '@/lib/hooks/useMicrophone';
import { useWebRTC } from '@/lib/hooks/useWebRTC';
import { useAudioStream } from '@/lib/hooks/useAudioStream';
import { useVAD } from '@/lib/hooks/useVAD';

const founderPrograms = ['Y Combinator', 'TECHSTARS', 'ANTLER', '500 GLOBAL'];

const featureCards = [
  {
    title: 'Real-Time Interruption',
    description:
      'Experience the pressure of live Q&A with AI that cuts through the fluff and demands real answers.',
    icon: 'record_voice_over',
  },
  {
    title: 'Nova 2 Sonic Speed',
    description:
      'Low-latency processing for a fluid, natural conversation experience that feels like a real human dialogue.',
    icon: 'bolt',
  },
  {
    title: 'The Roast Report',
    description:
      "Get a comprehensive breakdown of your pitch's strengths, market logic gaps, and fatal flaws.",
    icon: 'analytics',
  },
];

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [isOverLimit, setIsOverLimit] = useState(false);

  const {
    isRequesting,
    error: micError,
    requestPermission,
    stopStream,
  } = useMicrophone();

  const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  const wsUrl = userId
    ? `${baseWsUrl}?userId=${encodeURIComponent(userId)}`
    : baseWsUrl;
  const { status, error: wsError, connect, disconnect } = useWebRTC({ wsUrl });

  const { startCapture, stopCapture, playAudio, stopPlayback } = useAudioStream({
    sampleRate: 16000,
    chunkDurationMs: 20,
  });
  
  const { startVAD, stopVAD } = useVAD(
    { silenceThresholdMs: 1500, volumeThreshold: 0.01 },
    {
      onSpeechStart: () => {},
      onSpeechEnd: () => {},
    }
  );

  const checkDailyUsage = async () => {
    try {
      const response = await fetch('/api/usage/check', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setIsOverLimit(data.isOverLimit);
      }
    } catch {
      setIsOverLimit(false);
    }
  };

  // Check daily usage on mount
  useEffect(() => {
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback for HTTP (non-secure) contexts
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    };
    const storedUserId = localStorage.getItem('pitchroast_user_id') || generateId();
    localStorage.setItem('pitchroast_user_id', storedUserId);
    setUserId(storedUserId);
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
    } catch {
      // Connection and permission failures are surfaced in the UI state.
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
    <div className="min-h-screen bg-[#f6f5f8] text-[#1e1b26]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#8b5cf6]/10 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#5b21b6] text-white shadow-lg shadow-[#8b5cf6]/25">
              <span className="absolute inset-[3px] rounded-[10px] border border-white/20" />
              <span className="text-base font-black tracking-[-0.08em]">PR</span>
              <span className="absolute -right-1 top-1 h-3 w-3 rounded-full bg-white/80 blur-[2px]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              Pitch Roast <span className="text-[#8b5cf6]">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-semibold transition-colors hover:text-[#8b5cf6]">
              Features
            </a>
            <a href="#proof" className="text-sm font-semibold transition-colors hover:text-[#8b5cf6]">
              Testimonials
            </a>
            <a href="#cta" className="text-sm font-semibold transition-colors hover:text-[#8b5cf6]">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden px-4 py-2 text-sm font-bold transition-colors hover:text-[#8b5cf6] sm:block">
              Login
            </button>
            <button
              onClick={handleStartPitch}
              disabled={isRequesting || isOverLimit}
              className="rounded-full bg-[#8b5cf6] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/20 transition-all hover:scale-[1.02] hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:shadow-none"
            >
              {isRequesting ? 'Requesting...' : isOverLimit ? 'Maintenance' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24">
        <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-6">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-[#f6f5f8]" />
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCVCJ0KtE94gRoVuC4Pn-z-wBpaHsAMe3n75TLRf10TDVYwbAfS7T11baJ37C3X9Vbj_4yhGUwqWWqvU1ikDeDjY0xPh3n64UNWz8xijJAasTwkgG7bSlkYp01QBfSXjlIikviaXTw1-YZ8KGOF5bNFoJedIykZ1zpUYVaJelMe2DCdtUKAkQqSiDr1pmp2YY8f46OtxBppUEWl2FBISntorDD3FxuyZ9S4CZ_lnR6Ns6WOBoz-jBrDoXnnsJ4_kXR7QQXP06OrPB56')",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#8b5cf6]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8b5cf6] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8b5cf6]" />
              </span>
              Now Powered by Nova-2
            </div>

            <h1 className="mb-6 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
              Survive the Selection.
              <br />
              <span className="text-[#8b5cf6]">Perfect Your Pitch.</span>
            </h1>

            <p className="mb-10 max-w-2xl text-lg font-medium leading-relaxed text-[#6b7280] md:text-xl">
              The AI investor that roasts your startup until it&apos;s fundable. Get the
              tough questions before you walk into the room.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {status === 'idle' ? (
                <button
                  onClick={handleStartPitch}
                  disabled={isRequesting || isOverLimit}
                  className="group flex items-center gap-2 rounded-full bg-[#8b5cf6] px-8 py-4 text-lg font-bold text-white shadow-xl shadow-[#8b5cf6]/30 transition-all hover:scale-105 hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:shadow-none"
                >
                  {isRequesting
                    ? 'Requesting permission...'
                    : isOverLimit
                      ? 'Maintenance Mode'
                      : 'Start Your Roast'}
                  <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleEndPitch}
                  className="rounded-full bg-[#8b5cf6] px-8 py-4 text-lg font-bold text-white shadow-xl shadow-[#8b5cf6]/30 transition-all hover:scale-105 hover:bg-[#7c3aed]"
                >
                  End Call
                </button>
              )}

              <a
                href="#features"
                className="rounded-full border border-[#8b5cf6]/20 bg-white px-8 py-4 text-lg font-bold text-[#1e1b26] transition-all hover:bg-[#8b5cf6]/5"
              >
                Watch Demo
              </a>
            </div>

            <div className="mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-3">
              <div className="flex min-h-[152px] flex-col justify-between rounded-2xl border border-white/60 bg-white/70 p-5 text-left shadow-lg backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b7280]">Status</p>
                <p className="mt-2 text-lg font-bold text-[#1e1b26]">{getStatusMessage()}</p>
              </div>
              <div className="flex min-h-[152px] flex-col justify-between rounded-2xl border border-white/60 bg-white/70 p-5 text-left shadow-lg backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b7280]">Session</p>
                <p className="mt-2 text-lg font-bold text-[#1e1b26]">
                  {status === 'idle' ? '2-minute mock call' : formatTime(timeRemaining)}
                </p>
              </div>
              <div className="flex min-h-[152px] flex-col justify-between rounded-2xl border border-white/60 bg-white/70 p-5 text-left shadow-lg backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b7280]">Outcome</p>
                <p className="mt-2 text-lg font-bold text-[#1e1b26]">
                  Real-time feedback and roast report
                </p>
              </div>
            </div>

            {(micError || wsError || isOverLimit || sessionId) && (
              <div className="mt-6 flex w-full max-w-3xl flex-col gap-3 text-left">
                {micError && (
                  <div className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-red-700 shadow-sm">
                    {micError}
                  </div>
                )}
                {wsError && (
                  <div className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-red-700 shadow-sm">
                    {wsError}
                  </div>
                )}
                {isOverLimit && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-700 shadow-sm">
                    System is currently in maintenance mode due to high usage. Please try again later.
                  </div>
                )}
                {sessionId && status === 'idle' && (
                  <div className="rounded-2xl border border-[#8b5cf6]/15 bg-white/80 px-5 py-4 shadow-sm">
                    <Link
                      href="/dashboard"
                      className="font-semibold text-[#8b5cf6] underline underline-offset-4"
                    >
                      View your roast reports →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section id="proof" className="border-y border-[#8b5cf6]/5 bg-white py-12">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">
              Trusted by Founders From
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 opacity-60 grayscale transition-all duration-500 hover:grayscale-0 md:gap-24">
              {founderPrograms.map((program) => (
                <div key={program} className="text-2xl font-bold tracking-tighter">
                  {program}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#f6f5f8] px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-black md:text-5xl">Engineered for Excellence</h2>
              <p className="mx-auto max-w-2xl font-medium text-[#6b7280]">
                Our AI mimics the toughest VCs in the valley to ensure your deck and
                delivery are bulletproof.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {featureCards.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative flex h-full min-h-[280px] flex-col rounded-[1.25rem] border border-[#8b5cf6]/10 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-[#8b5cf6]/5"
                >
                  <div className="mb-6 inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6] transition-colors group-hover:bg-[#8b5cf6] group-hover:text-white">
                    <span className="material-symbols-outlined text-2xl leading-none">{feature.icon}</span>
                  </div>
                  <h3 className="mb-3 text-xl font-extrabold">{feature.title}</h3>
                  <p className="mt-auto leading-relaxed text-[#6b7280]">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cta" className="relative overflow-hidden bg-[#1e1b26] px-6 py-24 text-white">
          <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 opacity-20">
            <div className="h-96 w-96 rounded-full bg-[#8b5cf6] blur-[100px]" />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-4xl font-black md:text-6xl">Ready for the firing squad?</h2>
            <p className="mb-10 text-lg text-slate-300">
              Don&apos;t find out your pitch has holes when you&apos;re in front of Sequoia.
              Roast it now.
            </p>
            <button
              onClick={handleStartPitch}
              disabled={isRequesting || isOverLimit}
              className="rounded-full bg-[#8b5cf6] px-10 py-5 text-xl font-black text-white shadow-2xl shadow-[#8b5cf6]/40 transition-all hover:scale-105 hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:bg-zinc-500 disabled:shadow-none"
            >
              {status === 'idle' ? 'Get Your Pitch Roasted Now' : 'Session In Progress'}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#8b5cf6]/5 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#5b21b6] text-white">
              <span className="text-[10px] font-black tracking-[-0.08em]">PR</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Pitch Roast AI</span>
          </div>
          <div className="flex gap-8">
            <a className="text-xs font-bold text-[#6b7280] transition-colors hover:text-[#8b5cf6]" href="#">
              Privacy
            </a>
            <a className="text-xs font-bold text-[#6b7280] transition-colors hover:text-[#8b5cf6]" href="#">
              Terms
            </a>
            <a className="text-xs font-bold text-[#6b7280] transition-colors hover:text-[#8b5cf6]" href="#">
              Twitter
            </a>
            <a className="text-xs font-bold text-[#6b7280] transition-colors hover:text-[#8b5cf6]" href="#">
              Discord
            </a>
          </div>
          <p className="text-xs font-medium text-[#6b7280]">© 2024 Pitch Roast AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

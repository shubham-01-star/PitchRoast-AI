'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CallSession } from '@/lib/types';

export default function Dashboard() {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const userId =
        localStorage.getItem('pitchroast_user_id') ||
        localStorage.getItem('pitchroast_session_id');

      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/sessions?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const nextSessions = data.sessions || [];
        setSessions(nextSessions);
        setSelectedSession(nextSessions[0] || null);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreTone = (score: number) => {
    if (score >= 80) {
      return {
        text: 'text-emerald-600',
        ring: 'border-emerald-200 bg-emerald-50',
        badge: 'High Conviction',
      };
    }

    if (score >= 60) {
      return {
        text: 'text-amber-600',
        ring: 'border-amber-200 bg-amber-50',
        badge: 'Promising',
      };
    }

    if (score >= 40) {
      return {
        text: 'text-orange-600',
        ring: 'border-orange-200 bg-orange-50',
        badge: 'Needs Work',
      };
    }

    return {
      text: 'text-rose-600',
      ring: 'border-rose-200 bg-rose-50',
      badge: 'Critical',
    };
  };

  const averageScore = sessions.length
    ? Math.round(
        sessions.reduce((sum, session) => sum + (session.roastReport?.score || 0), 0) / sessions.length
      )
    : 0;

  const latestScore = selectedSession?.roastReport?.score ?? sessions[0]?.roastReport?.score ?? 0;
  const transcriptCount = selectedSession?.transcript?.length ?? 0;
  const selectedTone = getScoreTone(selectedSession?.roastReport?.score ?? 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5f8] px-6">
        <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/80 px-10 py-8 text-center shadow-xl shadow-[#8b5cf6]/5 backdrop-blur-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#8b5cf6]/20 border-t-[#8b5cf6]" />
          <p className="text-lg font-semibold text-[#1e1b26]">Loading your roast reports...</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f5f8] text-[#1e1b26]">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-[#8b5cf6]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#7c3aed]/10 blur-[140px]" />
        <main className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-10 text-center shadow-2xl shadow-[#8b5cf6]/10 backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#5b21b6] text-white shadow-lg shadow-[#8b5cf6]/25">
              <span className="text-lg font-black tracking-[-0.08em]">PR</span>
            </div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[#8b5cf6]">
              Roast Dashboard
            </p>
            <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">
              No sessions yet.
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-[#6b7280]">
              Start your first pitch to unlock scorecards, transcripts, and founder feedback in
              one clean command center.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#8b5cf6] px-8 py-4 text-lg font-bold text-white shadow-xl shadow-[#8b5cf6]/20 transition-all hover:scale-[1.02] hover:bg-[#7c3aed]"
            >
              Start Your First Roast
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f5f8] text-[#1e1b26]">
      <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[#8b5cf6]/10 blur-[120px]" />
      <div className="absolute right-[-8rem] top-64 h-96 w-96 rounded-full bg-[#7c3aed]/10 blur-[140px]" />

      <header className="sticky top-0 z-30 border-b border-[#8b5cf6]/10 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#5b21b6] text-white shadow-lg shadow-[#8b5cf6]/25">
              <span className="absolute inset-[3px] rounded-[10px] border border-white/20" />
              <span className="text-base font-black tracking-[-0.08em]">PR</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              Pitch Roast <span className="text-[#8b5cf6]">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-full px-4 py-2 text-sm font-bold text-[#1e1b26] transition-colors hover:text-[#8b5cf6] sm:inline-flex"
            >
              Back Home
            </Link>
            <Link
              href="/"
              className="rounded-full bg-[#8b5cf6] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/20 transition-all hover:scale-[1.02] hover:bg-[#7c3aed]"
            >
              New Pitch
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-10 lg:px-12">
        <section className="mb-8 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-8 shadow-2xl shadow-[#8b5cf6]/8 backdrop-blur-sm">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[#8b5cf6]">
              Roast Dashboard
            </p>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl">
                  Your founder feedback command center.
                </h1>
                <p className="text-lg leading-relaxed text-[#6b7280]">
                  Review every session, inspect the toughest moments, and keep refining the pitch
                  until the signal is undeniable.
                </p>
              </div>
              <div className={`rounded-3xl border px-5 py-4 ${selectedTone.ring}`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">
                  Latest Verdict
                </p>
                <div className="mt-2 flex items-end gap-3">
                  <span className={`text-5xl font-black ${selectedTone.text}`}>{latestScore}</span>
                  <span className="pb-1 text-sm font-semibold text-[#6b7280]">/ 100</span>
                </div>
                <p className={`mt-2 text-sm font-bold ${selectedTone.text}`}>{selectedTone.badge}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/60 bg-white/80 p-5 shadow-lg shadow-[#8b5cf6]/5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">Total Sessions</p>
              <p className="mt-3 text-4xl font-black">{sessions.length}</p>
              <p className="mt-2 text-sm text-[#6b7280]">Every roast attempt is tracked here.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/60 bg-white/80 p-5 shadow-lg shadow-[#8b5cf6]/5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">Average Score</p>
              <p className="mt-3 text-4xl font-black text-[#8b5cf6]">{averageScore}</p>
              <p className="mt-2 text-sm text-[#6b7280]">A quick snapshot of overall readiness.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/60 bg-white/80 p-5 shadow-lg shadow-[#8b5cf6]/5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">Transcript Lines</p>
              <p className="mt-3 text-4xl font-black">{transcriptCount}</p>
              <p className="mt-2 text-sm text-[#6b7280]">Dialogue segments in the selected session.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/82 p-5 shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">Session Archive</p>
                <h2 className="mt-1 text-2xl font-black">Recent Roasts</h2>
              </div>
              <div className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-xs font-bold text-[#8b5cf6]">
                {sessions.length} total
              </div>
            </div>

            <div className="space-y-3">
              {sessions.map((session) => {
                const tone = getScoreTone(session.roastReport?.score ?? 0);

                return (
                  <button
                    key={session.id ?? session.sessionId}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full rounded-[1.4rem] border p-4 text-left transition-all ${
                      selectedSession?.sessionId === session.sessionId
                        ? 'border-[#8b5cf6]/30 bg-[#8b5cf6]/8 shadow-lg shadow-[#8b5cf6]/10'
                        : 'border-transparent bg-[#f8f6fb] hover:border-[#8b5cf6]/15 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1e1b26]">{formatDate(session.startTime)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#6b7280]">
                          Session {session.sessionId.slice(0, 8)}
                        </p>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-sm font-black ${tone.ring} ${tone.text}`}>
                        {session.roastReport?.score ?? '--'}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-[#6b7280]">
                      <span>{session.durationMs ? formatDuration(session.durationMs) : 'No duration'}</span>
                      <span>{session.transcript?.length ?? 0} transcript items</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-6">
            {selectedSession ? (
              <>
                <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-7 shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
                  <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">Selected Session</p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight">Roast Report</h2>
                      <p className="mt-2 text-base text-[#6b7280]">
                        {formatDate(selectedSession.startTime)} •{' '}
                        {selectedSession.durationMs ? formatDuration(selectedSession.durationMs) : 'No duration logged'}
                      </p>
                    </div>
                    {selectedSession.roastReport && (
                      <div className={`rounded-[1.5rem] border px-6 py-5 text-center ${selectedTone.ring}`}>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">Score</p>
                        <div className={`mt-2 text-6xl font-black ${selectedTone.text}`}>
                          {selectedSession.roastReport.score}
                        </div>
                        <p className={`mt-2 text-sm font-bold ${selectedTone.text}`}>{selectedTone.badge}</p>
                      </div>
                    )}
                  </div>

                  {selectedSession.roastReport ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.5rem] bg-[#f8f6fb] p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">Pitch Clarity</p>
                        <p className="mt-3 leading-7 text-[#3f3a4c]">{selectedSession.roastReport.pitchClarity}</p>
                      </div>
                      <div className="rounded-[1.5rem] bg-[#f8f6fb] p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">Confidence</p>
                        <p className="mt-3 leading-7 text-[#3f3a4c]">{selectedSession.roastReport.confidence}</p>
                      </div>
                      <div className="rounded-[1.5rem] bg-[#f8f6fb] p-5 md:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">
                          Tough Questions Handling
                        </p>
                        <p className="mt-3 leading-7 text-[#3f3a4c]">
                          {selectedSession.roastReport.toughQuestionsHandling}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] bg-[#f8f6fb] p-5 text-[#6b7280]">
                      This session does not have a report yet.
                    </div>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-6 shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-2xl font-black">Buzzwords</h3>
                      <span className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-xs font-bold text-[#8b5cf6]">
                        {selectedSession.roastReport?.buzzwords.length ?? 0}
                      </span>
                    </div>

                    {selectedSession.roastReport?.buzzwords.length ? (
                      <div className="space-y-3">
                        {selectedSession.roastReport.buzzwords.map((buzzword, index) => (
                          <div key={`${buzzword.buzzword}-${index}`} className="rounded-[1.25rem] bg-[#fff7f8] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-lg font-bold text-rose-600">{buzzword.buzzword}</p>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6b7280]">
                                Try: {buzzword.suggestion}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[#6b7280]">{buzzword.context}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] bg-[#f8f6fb] p-4 text-[#6b7280]">
                        No weak buzzwords detected in this run.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-6 shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-2xl font-black">Open Questions</h3>
                      <span className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-xs font-bold text-[#8b5cf6]">
                        {selectedSession.roastReport?.unansweredQuestions.length ?? 0}
                      </span>
                    </div>

                    {selectedSession.roastReport?.unansweredQuestions.length ? (
                      <div className="space-y-3">
                        {selectedSession.roastReport.unansweredQuestions.map((question, index) => (
                          <div key={`${question}-${index}`} className="rounded-[1.25rem] bg-[#f8f6fb] p-4">
                            <p className="font-medium leading-7 text-[#3f3a4c]">{question}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] bg-[#f8f6fb] p-4 text-[#6b7280]">
                        No unanswered questions were flagged for this session.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-6 shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-2xl font-black">Transcript</h3>
                    <span className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-xs font-bold text-[#8b5cf6]">
                      {selectedSession.transcript?.length ?? 0} entries
                    </span>
                  </div>

                  {selectedSession.transcript?.length ? (
                    <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                      {selectedSession.transcript.map((segment, index) => (
                        <div
                          key={`${segment.speaker}-${segment.startTime}-${index}`}
                          className={`rounded-[1.25rem] border p-4 ${
                            segment.speaker === 'user'
                              ? 'border-[#8b5cf6]/12 bg-[#f7f1ff]'
                              : 'border-[#ede8f8] bg-[#fbfafe]'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8b5cf6]">
                              {segment.speaker === 'user' ? 'Founder' : 'VC'}
                            </p>
                            <p className="text-xs font-semibold text-[#6b7280]">
                              {formatDuration(segment.startTime)}
                            </p>
                          </div>
                          <p className="leading-7 text-[#3f3a4c]">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] bg-[#f8f6fb] p-4 text-[#6b7280]">
                      No transcript captured for this session.
                    </div>
                  )}
                </div>

                {selectedSession.audioUrl && (
                  <div className="rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-6 shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
                    <h3 className="mb-4 text-2xl font-black">Recording</h3>
                    <audio controls className="w-full">
                      <source src={selectedSession.audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center rounded-[2rem] border border-[#8b5cf6]/10 bg-white/85 p-8 text-center shadow-xl shadow-[#8b5cf6]/6 backdrop-blur-sm">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#8b5cf6]">Nothing Selected</p>
                  <h2 className="mt-3 text-3xl font-black">Choose a session to inspect the roast.</h2>
                  <p className="mt-3 text-[#6b7280]">
                    Pick any run from the left rail to open scores, transcript, and feedback.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { CallSession } from '@/lib/types';

export default function Dashboard() {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const sessionId = localStorage.getItem('pitchroast_session_id');
      if (!sessionId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/sessions?userId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Sessions Yet</h1>
          <p className="text-zinc-400 mb-8">Start your first pitch to see your roast reports here</p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors inline-block"
          >
            Start Pitch
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Your Roast Reports</h1>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            New Pitch
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session List */}
          <div className="lg:col-span-1 space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedSession?.id === session.id
                    ? 'bg-blue-900/40 border-2 border-blue-500'
                    : 'bg-zinc-800/50 border-2 border-transparent hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-zinc-400">
                    {formatDate(session.startTime)}
                  </div>
                  {session.roastReport && (
                    <div className={`text-2xl font-bold ${getScoreColor(session.roastReport.score)}`}>
                      {session.roastReport.score}
                    </div>
                  )}
                </div>
                {session.durationMs && (
                  <div className="text-xs text-zinc-500">
                    Duration: {formatDuration(session.durationMs)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Session Detail */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <div className="bg-zinc-800/50 rounded-lg p-6 space-y-6">
                {/* Roast Report */}
                {selectedSession.roastReport && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Roast Report</h2>
                    <div className={`text-6xl font-bold mb-6 ${getScoreColor(selectedSession.roastReport.score)}`}>
                      {selectedSession.roastReport.score}/100
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Pitch Clarity</h3>
                        <p className="text-zinc-300">{selectedSession.roastReport.pitchClarity}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Confidence</h3>
                        <p className="text-zinc-300">{selectedSession.roastReport.confidence}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Tough Questions Handling</h3>
                        <p className="text-zinc-300">{selectedSession.roastReport.toughQuestionsHandling}</p>
                      </div>
                      
                      {selectedSession.roastReport.buzzwords.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">Buzzwords Detected</h3>
                          <div className="space-y-2">
                            {selectedSession.roastReport.buzzwords.map((bw, idx) => (
                              <div key={idx} className="bg-zinc-900/50 p-3 rounded">
                                <div className="text-red-400 font-semibold">{bw.buzzword}</div>
                                <div className="text-sm text-zinc-400">Try: {bw.suggestion}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedSession.roastReport.unansweredQuestions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">Unanswered Questions</h3>
                          <ul className="list-disc list-inside text-zinc-300 space-y-1">
                            {selectedSession.roastReport.unansweredQuestions.map((q, idx) => (
                              <li key={idx}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {selectedSession.transcript && selectedSession.transcript.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Transcript</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedSession.transcript.map((segment, idx) => (
                        <div key={idx} className={`p-3 rounded ${
                          segment.speaker === 'user' ? 'bg-blue-900/20' : 'bg-zinc-900/50'
                        }`}>
                          <div className="text-xs text-zinc-500 mb-1">
                            {segment.speaker === 'user' ? 'You' : 'VC'} • {formatDuration(segment.startTime)}
                          </div>
                          <div className="text-zinc-200">{segment.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio Player */}
                {selectedSession.audioUrl && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Recording</h2>
                    <audio controls className="w-full">
                      <source src={selectedSession.audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-800/50 rounded-lg p-6 flex items-center justify-center h-full">
                <p className="text-zinc-400 text-lg">Select a session to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

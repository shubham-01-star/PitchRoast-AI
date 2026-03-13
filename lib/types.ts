export interface CallSession {
  id?: string;
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  audioUrl?: string;
  transcript?: TranscriptSegment[];
  roastReport?: RoastReport;
  tokenCount?: number;
  createdAt?: Date;
}

export interface TranscriptSegment {
  speaker: 'user' | 'vc';
  text: string;
  startTime: number;
  endTime: number;
}

export interface RoastReport {
  score: number;
  pitchClarity: string;
  confidence: string;
  toughQuestionsHandling: string;
  buzzwords: BuzzwordAnalysis[];
  unansweredQuestions: string[];
  generationTimeMs: number;
}

export interface BuzzwordAnalysis {
  buzzword: string;
  suggestion: string;
  context: string;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface WebSocketMessage {
  type: 'audio' | 'control' | 'transcript' | 'error' | 'status';
  payload: any;
  timestamp: number;
}

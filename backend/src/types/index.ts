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

export interface WebSocketConfig {
  bedrockRegion: string;
  bedrockModelId: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  sessionTimeoutMs: number;
}

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
  durationMs: number;
}

export interface VADState {
  isSpeaking: boolean;
  speechStart?: number;
  speechDurationMs: number;
  lastActivity: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  tokenCount: number;
  audioDurationMs: number;
  reconnectionCount: number;
}

export interface BedrockConfig {
  region: string;
  modelId: string;
  voiceId?: string;
}

export interface BedrockResponse {
  audioStream: ReadableStream;
  text?: string;
  metadata: {
    tokenCount: number;
    modelId: string;
    latencyMs: number;
  };
}

export interface RoastRequest {
  sessionId: string;
  transcript: TranscriptSegment[];
  metrics: SessionMetrics;
}

export interface RoastResponse {
  score: number;
  pitchClarity: string;
  confidence: string;
  toughQuestionsHandling: string;
  buzzwords: BuzzwordAnalysis[];
  unansweredQuestions: string[];
  generationTimeMs: number;
}

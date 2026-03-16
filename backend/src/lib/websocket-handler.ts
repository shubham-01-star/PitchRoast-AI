import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { CallSession, RoastReport, SessionMetrics, VADState, TranscriptSegment } from '../types';
import { config } from '../config';
import BedrockClient from './bedrock-client';
import { BuzzwordDetector } from './buzzword-detector';
import { Logger } from './logger';
import DatabaseClient from './database';

export class WebSocketHandler {
  private ws: WebSocket;
  private sessionId: string;
  private userId: string;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private vadState: VADState;
  private metrics: SessionMetrics;
  private startTime: number;
  private bedrockClient: BedrockClient;
  private transcript: TranscriptSegment[] = [];
  private isProcessingAudio: boolean = false;
  private vcAgentSpeaking: boolean = false;
  private userSpeechStartTime: number | null = null;
  private buzzwordDetector: BuzzwordDetector;
  private logger: Logger;
  private db: DatabaseClient;
  private sessionRecordPromise: Promise<void>;
  private isFinalizing: boolean = false;
  private hasGeneratedReport: boolean = false;

  constructor(ws: WebSocket, userId?: string) {
    this.ws = ws;
    this.sessionId = uuidv4();
    this.userId = userId || this.sessionId;
    this.startTime = Date.now();
    this.bedrockClient = new BedrockClient();
    this.buzzwordDetector = new BuzzwordDetector();
    this.logger = new Logger(this.sessionId);
    this.db = new DatabaseClient();
    
    this.vadState = {
      isSpeaking: false,
      speechDurationMs: 0,
      lastActivity: Date.now(),
    };
    
    this.metrics = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      tokenCount: 0,
      audioDurationMs: 0,
      reconnectionCount: 0,
    };

    this.sessionRecordPromise = this.createSessionRecord();
    this.setupConnection();
    this.enforceSessionTimeout();
    this.startBedrockSession();
  }

  private async createSessionRecord() {
    try {
      await this.db.createSession({
        sessionId: this.sessionId,
        userId: this.userId,
        startTime: new Date(this.startTime),
        tokenCount: 0,
      });
    } catch (error) {
      this.logger.error('Failed to create session record', error, {
        userId: this.userId,
      });
    }
  }

  private async startBedrockSession() {
    try {
      console.log(`[${this.sessionId}] Starting Bedrock session, model: ${process.env.BEDROCK_MODEL_ID}`);
      await this.bedrockClient.startSession(
        // on audio chunk from VC
        (audio: string) => {
          this.vcAgentSpeaking = true;
          this.send({ type: 'audio', payload: { audio }, timestamp: Date.now() });
        },
        // on transcript
        (text: string, speaker: 'user' | 'vc') => {
          const segment: TranscriptSegment = {
            speaker,
            text,
            startTime: Date.now() - this.startTime,
            endTime: Date.now() - this.startTime,
          };
          this.transcript.push(segment);
          if (speaker === 'user' && this.buzzwordDetector.shouldInterrupt(text)) {
            this.bedrockClient.cancelGeneration();
          }
        },
        // on token usage
        (tokens: number) => {
          this.metrics.tokenCount += tokens;
          this.sessionRecordPromise
            .then(() => this.db.logTokenUsage(this.sessionId, tokens))
            .catch(e => this.logger.error('Failed to log token usage', e));
        },
      );
      console.log(`[${this.sessionId}] Bedrock session started OK`);
    } catch (error: any) {
      console.error(`[${this.sessionId}] Bedrock session FAILED:`, error?.message || error);
      this.sendError('Failed to connect to AI service: ' + (error?.message || 'Unknown'));
    }
  }

  private setupConnection() {
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
    
    // Send session ID to client
    this.send({
      type: 'status',
      payload: {
        sessionId: this.sessionId,
        message: 'Session established',
      },
      timestamp: Date.now(),
    });
  }

  private handleMessage(data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'audio':
          this.handleAudioChunk(message.payload);
          break;
        case 'control':
          this.handleControlMessage(message.payload);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError('Failed to process message');
    }
  }

  private async handleAudioChunk(audioData: string) {
    this.vadState.lastActivity = Date.now();
    // Forward audio directly into the open Bedrock session
    this.bedrockClient.sendAudioChunk(audioData);
  }

  private handleControlMessage(payload: any) {
    const { action, data } = payload;
    
    switch (action) {
      case 'speech_start':
        this.handleSpeechStart();
        break;
      case 'speech_end':
        this.handleSpeechEnd();
        break;
      case 'barge_in':
        this.handleBargeIn();
        break;
      default:
        console.log('Unknown control action:', action);
    }
  }

  private handleSpeechStart() {
    this.vadState.isSpeaking = true;
    this.userSpeechStartTime = Date.now();
    
    // Check if VC agent is speaking (barge-in)
    if (this.vcAgentSpeaking) {
      this.handleBargeIn();
    }
  }

  private handleSpeechEnd() {
    this.vadState.isSpeaking = false;
    
    if (this.userSpeechStartTime) {
      const speechDuration = Date.now() - this.userSpeechStartTime;
      this.vadState.speechDurationMs += speechDuration;
      
      // Check if user spoke for more than 30 seconds
      if (speechDuration > 30000) {
        this.sendCancelSignal();
      }
      
      this.userSpeechStartTime = null;
    }
  }

  private handleBargeIn() {
    console.log(`Barge-in detected for session ${this.sessionId}`);
    
    // Send Stop signal to Bedrock
    this.sendStopSignal();
    
    // Reset VC agent speaking state
    this.vcAgentSpeaking = false;
  }

  private async sendCancelSignal() {
    console.log(`Sending Cancel signal for session ${this.sessionId} (user spoke > 30s)`);
    
    try {
      await this.bedrockClient.cancelGeneration();
      
      this.send({
        type: 'status',
        payload: {
          message: 'Generation cancelled',
          reason: 'User speech exceeded 30 seconds',
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to send cancel signal:', error);
    }
  }

  private async sendStopSignal() {
    console.log(`Sending Stop signal for session ${this.sessionId} (barge-in)`);
    
    try {
      await this.bedrockClient.stopGeneration();
      
      this.send({
        type: 'status',
        payload: {
          message: 'Generation stopped',
          reason: 'User interrupted',
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to send stop signal:', error);
    }
  }

  private async handleClose(code: number, reason: Buffer) {
    console.log(`[${this.sessionId}] WebSocket closed, code=${code}, reason=${reason?.toString() || 'none'}`);

    await this.finalizeSession();
  }

  private attemptReconnection() {
    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${config.session.maxReconnectAttempts} for session ${this.sessionId}`);
    
    setTimeout(() => {
      if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        console.log(`Reconnection attempt ${this.reconnectAttempts} failed - connection already closed`);
        
        if (this.reconnectAttempts < config.session.maxReconnectAttempts) {
          this.attemptReconnection();
        } else {
          this.logReconnectionFailure();
          this.cleanup();
        }
      }
    }, config.session.reconnectDelayMs);
    
    this.metrics.reconnectionCount = this.reconnectAttempts;
  }

  private logReconnectionFailure() {
    const errorLog = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      error: 'Reconnection failed',
      attempts: this.reconnectAttempts,
      context: {
        metrics: this.metrics,
        vadState: this.vadState,
      },
    };
    
    console.error('Reconnection failure:', JSON.stringify(errorLog, null, 2));
  }

  private handleError(error: Error) {
    this.logger.error('WebSocket error', error, {
      sessionId: this.sessionId,
      metrics: this.metrics,
    });
    this.sendError(error.message);
  }

  private enforceSessionTimeout() {
    const timeoutMs = config.session.timeoutMs;
    
    this.sessionTimeout = setTimeout(() => {
      console.log(`Session ${this.sessionId} timed out after ${timeoutMs}ms`);
      this.send({
        type: 'status',
        payload: {
          message: 'Session timeout',
          reason: 'Maximum session duration reached',
        },
        timestamp: Date.now(),
      });

      void this.finalizeSession().finally(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(1000, 'Session timeout');
        }
      });
    }, timeoutMs);
  }

  private async generateRoastReport() {
    if (this.hasGeneratedReport) {
      return;
    }

    console.log(`Generating roast report for session ${this.sessionId}`);
    
    try {
      // End the Bedrock session before generating report
      await this.bedrockClient.endSession();

      const roastReport = await this.bedrockClient.generateRoastReport({
        sessionId: this.sessionId,
        transcript: this.transcript,
        metrics: this.metrics,
      });
      
      this.send({ type: 'roast_report', payload: roastReport, timestamp: Date.now() });
      this.hasGeneratedReport = true;

      // Store in database
      await this.sessionRecordPromise;
      await this.db.updateSession(this.sessionId, {
        endTime: new Date(),
        durationMs: Date.now() - this.startTime,
        transcript: this.transcript,
        roastReport,
        tokenCount: this.metrics.tokenCount,
      }).catch(e => this.logger.error('Failed to save session', e));

    } catch (error) {
      console.error('Failed to generate roast report:', error);
      this.sendError('Failed to generate roast report');
    }
  }

  private buildNoSpeechReport(): RoastReport {
    return {
      score: 0,
      pitchClarity: 'No speech was captured in this session, so the pitch could not be evaluated.',
      confidence: 'Not enough audio was provided to assess delivery confidence.',
      toughQuestionsHandling: 'No answers were recorded, so question handling could not be scored.',
      buzzwords: [],
      unansweredQuestions: [
        'What problem are you solving?',
        'Why now?',
        'What traction or proof points do you have?',
      ],
      generationTimeMs: 0,
    };
  }

  private async finalizeSession() {
    if (this.isFinalizing) {
      return;
    }

    this.isFinalizing = true;

    try {
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
        this.sessionTimeout = null;
      }

      if (this.metrics.endTime === undefined) {
        this.metrics.endTime = Date.now();
      }

      const hasSessionContent = this.transcript.length > 0 || this.metrics.tokenCount > 0;

      if (hasSessionContent) {
        await this.generateRoastReport();
      } else {
        const roastReport = this.buildNoSpeechReport();
        await this.sessionRecordPromise;
        await this.db.updateSession(this.sessionId, {
          endTime: new Date(),
          durationMs: Date.now() - this.startTime,
          transcript: [],
          roastReport,
          tokenCount: this.metrics.tokenCount,
        });
        this.hasGeneratedReport = true;
      }
    } catch (error) {
      this.logger.error('Failed to finalize session', error, {
        userId: this.userId,
      });
    } finally {
      this.cleanup();
    }
  }

  private send(message: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendError(message: string) {
    this.send({
      type: 'error',
      payload: { message },
      timestamp: Date.now(),
    });
  }

  private cleanup() {
    if (this.metrics.endTime === undefined) {
      this.metrics.endTime = Date.now();
    }
    console.log(`Session ${this.sessionId} metrics:`, this.metrics);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }
}

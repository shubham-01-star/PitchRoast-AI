import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithBidirectionalStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { RoastRequest, RoastResponse } from '../types';

export class BedrockClient {
  private client: BedrockRuntimeClient;
  private sonicModelId: string;
  private liteModelId: string;

  private inputQueue: Buffer[] = [];
  private resolveNext: ((val: IteratorResult<any>) => void) | null = null;
  private streamDone: boolean = false;
  private streamPromise: Promise<void> | null = null;
  private promptName: string = '';
  private audioContentName: string = '';
  private systemContentName: string = '';
  private onAudioChunk: ((audio: string) => void) | null = null;
  private onTranscript: ((text: string, speaker: 'user' | 'vc') => void) | null = null;
  private onUsage: ((tokens: number) => void) | null = null;
  private sessionActive: boolean = false;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.sonicModelId = config.aws.bedrockModelId;
    this.liteModelId = config.aws.bedrockLiteModelId;
  }

  async startSession(
    onAudioChunk: (audio: string) => void,
    onTranscript: (text: string, speaker: 'user' | 'vc') => void,
    onUsage: (tokens: number) => void,
  ): Promise<void> {
    this.onAudioChunk = onAudioChunk;
    this.onTranscript = onTranscript;
    this.onUsage = onUsage;
    this.promptName = uuidv4();
    this.audioContentName = uuidv4();
    this.systemContentName = uuidv4();
    this.sessionActive = true;
    this.inputQueue = [];
    this.streamDone = false;
    this.resolveNext = null;

    const self = this;

    const bodyIterable: AsyncIterable<any> = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<any>> {
            if (self.inputQueue.length > 0) {
              const bytes = self.inputQueue.shift()!;
              return Promise.resolve({ value: { chunk: { bytes } }, done: false });
            }
            if (self.streamDone) {
              return Promise.resolve({ value: undefined, done: true });
            }
            return new Promise(resolve => {
              self.resolveNext = resolve;
            });
          },
        };
      },
    };

    const command = new InvokeModelWithBidirectionalStreamCommand({
      modelId: this.sonicModelId,
      body: bodyIterable,
    });

    console.log(`[BedrockClient] Sending bidirectional stream command, model=${this.sonicModelId}`);

    this.streamPromise = this.client.send(command)
      .then(response => {
        console.log('[BedrockClient] Stream established, processing output...');
        return this.processOutputStream(response);
      })
      .catch(err => {
        console.error('[BedrockClient] Stream error:', err?.message || err);
        console.error('[BedrockClient] Error details:', JSON.stringify(err?.$metadata || {}));
      });

    // sessionStart — include turnDetectionConfiguration for Nova 2 Sonic
    this.sendEvent({
      event: {
        sessionStart: {
          inferenceConfiguration: {
            maxTokens: 1024,
            topP: 0.9,
            temperature: 0.7,
          },
          turnDetectionConfiguration: {
            endpointingSensitivity: 'MEDIUM',
          },
        },
      },
    });

    // promptStart
    this.sendEvent({
      event: {
        promptStart: {
          promptName: this.promptName,
          textOutputConfiguration: { mediaType: 'text/plain' },
          audioOutputConfiguration: {
            mediaType: 'audio/lpcm',
            sampleRateHertz: 16000,
            sampleSizeBits: 16,
            channelCount: 1,
            voiceId: 'matthew',
            encoding: 'base64',
            audioType: 'SPEECH',
          },
        },
      },
    });

    // system prompt contentStart
    this.sendEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: this.systemContentName,
          type: 'TEXT',
          interactive: false,
          role: 'SYSTEM',
          textInputConfiguration: { mediaType: 'text/plain' },
        },
      },
    });

    // system prompt text
    this.sendEvent({
      event: {
        textInput: {
          promptName: this.promptName,
          contentName: this.systemContentName,
          content: this.getVCAgentPrompt(),
        },
      },
    });

    // system prompt contentEnd
    this.sendEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: this.systemContentName,
        },
      },
    });

    // open audio content block
    this.sendEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: this.audioContentName,
          type: 'AUDIO',
          interactive: true,
          role: 'USER',
          audioInputConfiguration: {
            mediaType: 'audio/lpcm',
            sampleRateHertz: 16000,
            sampleSizeBits: 16,
            channelCount: 1,
            audioType: 'SPEECH',
            encoding: 'base64',
          },
        },
      },
    });

    console.log(`[BedrockClient] Session initialized, promptName=${this.promptName}`);
  }

  sendAudioChunk(base64Audio: string): void {
    if (!this.sessionActive) return;
    this.sendEvent({
      event: {
        audioInput: {
          promptName: this.promptName,
          contentName: this.audioContentName,
          content: base64Audio,
        },
      },
    });
  }

  async cancelGeneration(): Promise<void> {
    await this.interruptAndReopen();
  }

  async stopGeneration(): Promise<void> {
    await this.interruptAndReopen();
  }

  private async interruptAndReopen(): Promise<void> {
    if (!this.sessionActive) return;
    // Close current audio block
    this.sendEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: this.audioContentName,
        },
      },
    });
    // Open a new audio block
    this.audioContentName = uuidv4();
    this.sendEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: this.audioContentName,
          type: 'AUDIO',
          interactive: true,
          role: 'USER',
          audioInputConfiguration: {
            mediaType: 'audio/lpcm',
            sampleRateHertz: 16000,
            sampleSizeBits: 16,
            channelCount: 1,
            audioType: 'SPEECH',
            encoding: 'base64',
          },
        },
      },
    });
  }

  async endSession(): Promise<void> {
    if (!this.sessionActive) return;
    this.sessionActive = false;
    this.sendEvent({ event: { contentEnd: { promptName: this.promptName, contentName: this.audioContentName } } });
    this.sendEvent({ event: { promptEnd: { promptName: this.promptName } } });
    this.sendEvent({ event: { sessionEnd: {} } });
    this.streamDone = true;
    if (this.resolveNext) {
      this.resolveNext({ value: undefined, done: true });
      this.resolveNext = null;
    }
    if (this.streamPromise) await this.streamPromise.catch(() => {});
  }

  private sendEvent(event: any): void {
    const bytes = Buffer.from(JSON.stringify(event), 'utf-8');
    if (this.resolveNext) {
      const r = this.resolveNext;
      this.resolveNext = null;
      r({ value: { chunk: { bytes } }, done: false });
    } else {
      this.inputQueue.push(bytes);
    }
  }

  private async processOutputStream(response: any): Promise<void> {
    if (!response.body) {
      console.error('[BedrockClient] No response body');
      return;
    }
    try {
      for await (const event of response.body) {
        try {
          // Handle error events from the stream
          if (event?.internalServerException) {
            console.error('[BedrockClient] InternalServerException:', event.internalServerException.message);
            continue;
          }
          if (event?.validationException) {
            console.error('[BedrockClient] ValidationException:', event.validationException.message);
            continue;
          }
          if (event?.modelStreamErrorException) {
            console.error('[BedrockClient] ModelStreamErrorException:', event.modelStreamErrorException.message);
            continue;
          }

          const bytes = event?.chunk?.bytes;
          if (!bytes) continue;

          const json = JSON.parse(Buffer.from(bytes).toString('utf-8'));
          const ev = json?.event;
          if (!ev) continue;

          // Nova 2 Sonic output event format
          if (ev.audioOutput?.content) {
            this.onAudioChunk?.(ev.audioOutput.content);
          }

          // textOutput for transcripts (USER = ASR, ASSISTANT = VC response)
          if (ev.textOutput?.content) {
            // Determine speaker from role context — default to vc for assistant
            this.onTranscript?.(ev.textOutput.content, 'vc');
          }

          // usageEvent for token tracking (Nova 2 Sonic format)
          if (ev.usageEvent) {
            const total = ev.usageEvent.totalTokens || 0;
            if (total > 0) this.onUsage?.(total);
          }

          // Legacy metadata.usage format (Nova Sonic v1)
          if (ev.metadata?.usage) {
            const tokens = (ev.metadata.usage.inputTokens || 0) + (ev.metadata.usage.outputTokens || 0);
            if (tokens > 0) this.onUsage?.(tokens);
          }

          // Log completion events for debugging
          if (ev.completionStart) {
            console.log('[BedrockClient] completionStart:', ev.completionStart.completionId);
          }
          if (ev.completionEnd) {
            console.log('[BedrockClient] completionEnd, stopReason:', ev.completionEnd.stopReason);
          }
        } catch (parseErr: any) {
          console.error('[BedrockClient] Failed to parse output event:', parseErr?.message);
        }
      }
      console.log('[BedrockClient] Output stream ended');
    } catch (err: any) {
      console.error('[BedrockClient] Output stream error:', err?.message || err);
    }
  }

  async generateRoastReport(request: RoastRequest): Promise<RoastResponse> {
    const startTime = Date.now();
    const prompt = this.getRoastReportPrompt(request);
    const payload = {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 2000, temperature: 0.8 },
    };
    const command = new InvokeModelCommand({
      modelId: this.liteModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });
    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const reportText = responseBody.content[0].text;
      return this.parseRoastReport(reportText, Date.now() - startTime);
    } catch (error) {
      console.error('Roast report generation error:', error);
      throw error;
    }
  }

  private getVCAgentPrompt(): string {
    return `You are a brutal Silicon Valley VC investor conducting a 2-minute pitch call. Your personality:
- Impatient and skeptical
- Ask tough questions: "What is your CAC?", "Why now?", "Who are your competitors?"
- Interrupt when you hear buzzwords like "disruptive", "revolutionary", "game-changer"
- Challenge vague answers with follow-up questions demanding specifics

Start with: "Hi, I have 2 minutes before my next board meeting. Pitch me your startup."

Keep responses concise. Focus on metrics, market validation, and competitive advantages.`;
  }

  private getRoastReportPrompt(request: RoastRequest): string {
    const transcriptText = request.transcript
      .map((seg: any) => `${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n');
    return `Analyze this startup pitch and provide a roast report as JSON:
TRANSCRIPT:\n${transcriptText}

{
  "score": <0-100>,
  "pitchClarity": "<assessment>",
  "confidence": "<assessment>",
  "toughQuestionsHandling": "<assessment>",
  "buzzwords": [{"buzzword": "<word>", "suggestion": "<alternative>", "context": "<where>"}],
  "unansweredQuestions": ["<question>"]
}`;
  }

  private parseRoastReport(reportText: string, generationTimeMs: number): RoastResponse {
    try {
      const jsonMatch = reportText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const report = JSON.parse(jsonMatch[0]);
      return {
        score: report.score || 0,
        pitchClarity: report.pitchClarity || 'Unable to assess',
        confidence: report.confidence || 'Unable to assess',
        toughQuestionsHandling: report.toughQuestionsHandling || 'Unable to assess',
        buzzwords: report.buzzwords || [],
        unansweredQuestions: report.unansweredQuestions || [],
        generationTimeMs,
      };
    } catch {
      return {
        score: 50,
        pitchClarity: 'Unable to generate feedback',
        confidence: 'Unable to generate feedback',
        toughQuestionsHandling: 'Unable to generate feedback',
        buzzwords: [],
        unansweredQuestions: [],
        generationTimeMs,
      };
    }
  }
}

export default BedrockClient;

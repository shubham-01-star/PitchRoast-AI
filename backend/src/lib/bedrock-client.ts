import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config';
import { BedrockConfig, RoastRequest, RoastResponse } from '../types';

export class BedrockClient {
  private client: BedrockRuntimeClient;
  private sonicModelId: string;
  private liteModelId: string;

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

  async streamAudio(audioChunk: string, systemPrompt?: string): Promise<AsyncIterable<any>> {
    const prompt = systemPrompt || this.getVCAgentPrompt();
    
    const payload = {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'audio',
              source: {
                bytes: Buffer.from(audioChunk, 'base64'),
              },
            },
          ],
        },
      ],
      system: [{ text: prompt }],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.7,
      },
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.sonicModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.client.send(command);
      return this.processStreamResponse(response);
    } catch (error) {
      console.error('Bedrock API error:', error);
      throw error;
    }
  }

  private async *processStreamResponse(response: any): AsyncIterable<any> {
    if (!response.body) {
      return;
    }

    for await (const event of response.body) {
      if (event.chunk) {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
        yield chunk;
      }
    }
  }

  async generateRoastReport(request: RoastRequest): Promise<RoastResponse> {
    const startTime = Date.now();
    
    const prompt = this.getRoastReportPrompt(request);
    
    const payload = {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0.8,
      },
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
      
      const generationTimeMs = Date.now() - startTime;
      
      // Parse the response text to extract roast report
      const reportText = responseBody.content[0].text;
      return this.parseRoastReport(reportText, generationTimeMs);
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
- Maintain a professional but demanding tone

Start with: "Hi, I have 2 minutes before my next board meeting. Pitch me your startup."

Keep responses concise and pointed. Focus on metrics, market validation, and competitive advantages.`;
  }

  private getRoastReportPrompt(request: RoastRequest): string {
    const transcriptText = request.transcript
      .map(seg => `${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n');

    return `Analyze this startup pitch call and provide a brutal but constructive roast report.

TRANSCRIPT:
${transcriptText}

SESSION METRICS:
- Duration: ${request.metrics.audioDurationMs}ms
- Tokens used: ${request.metrics.tokenCount}

Provide your analysis in the following JSON format:
{
  "score": <number 0-100>,
  "pitchClarity": "<brief assessment>",
  "confidence": "<brief assessment>",
  "toughQuestionsHandling": "<brief assessment>",
  "buzzwords": [
    {
      "buzzword": "<word used>",
      "suggestion": "<better alternative>",
      "context": "<where it was used>"
    }
  ],
  "unansweredQuestions": ["<list of questions not answered well>"]
}

Be honest and direct. Focus on actionable feedback.`;
  }

  private parseRoastReport(reportText: string, generationTimeMs: number): RoastResponse {
    try {
      // Extract JSON from the response
      const jsonMatch = reportText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in roast report response');
      }
      
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
    } catch (error) {
      console.error('Failed to parse roast report:', error);
      
      // Return a default report if parsing fails
      return {
        score: 50,
        pitchClarity: 'Unable to generate detailed feedback',
        confidence: 'Unable to generate detailed feedback',
        toughQuestionsHandling: 'Unable to generate detailed feedback',
        buzzwords: [],
        unansweredQuestions: [],
        generationTimeMs,
      };
    }
  }

  async cancelGeneration(): Promise<void> {
    // Send cancel signal to Bedrock
    console.log('Canceling current generation');
  }

  async stopGeneration(): Promise<void> {
    // Send stop signal to Bedrock
    console.log('Stopping current generation');
  }
}

export default BedrockClient;

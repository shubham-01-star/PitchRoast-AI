import { createHash, randomBytes } from 'crypto';

export class AudioStorage {
  private encryptionKey: Buffer;

  constructor() {
    // In production, load from secure environment variable
    const key = process.env.AUDIO_ENCRYPTION_KEY || randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  generateSignedUrl(audioUrl: string, expiresInSeconds: number = 3600): string {
    // Generate signed URL for temporary access
    const timestamp = Date.now() + (expiresInSeconds * 1000);
    const signature = this.generateSignature(audioUrl, timestamp);
    
    return `${audioUrl}?expires=${timestamp}&signature=${signature}`;
  }

  private generateSignature(url: string, timestamp: number): string {
    const data = `${url}:${timestamp}`;
    return createHash('sha256')
      .update(data)
      .update(this.encryptionKey)
      .digest('hex');
  }

  validateSignedUrl(url: string, signature: string, timestamp: number): boolean {
    // Check if expired
    if (Date.now() > timestamp) {
      return false;
    }
    
    // Validate signature
    const expectedSignature = this.generateSignature(url, timestamp);
    return signature === expectedSignature;
  }

  // Placeholder for S3 integration
  async uploadAudio(audioData: Buffer, sessionId: string): Promise<string> {
    // In production, upload to S3 with encryption at rest
    // For hackathon, store locally or skip
    console.log(`Audio upload for session ${sessionId} (${audioData.length} bytes)`);
    
    // Return placeholder URL
    return `/audio/${sessionId}.webm`;
  }
}

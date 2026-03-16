import mysql from 'mysql2/promise';
import { config } from '../config';
import { CallSession, TranscriptSegment, RoastReport, BuzzwordAnalysis } from '../types';

class DatabaseClient {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async createSession(session: CallSession): Promise<string> {
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.query(
        `INSERT INTO call_sessions (session_id, user_id, start_time, token_count)
         VALUES (?, ?, ?, ?)`,
        [session.sessionId, session.userId, session.startTime, session.tokenCount || 0]
      );
      return (result as any).insertId;
    } finally {
      connection.release();
    }
  }

  async updateSession(sessionId: string, updates: Partial<CallSession>): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.endTime !== undefined) {
        fields.push('end_time = ?');
        values.push(updates.endTime);
      }
      if (updates.durationMs !== undefined) {
        fields.push('duration_ms = ?');
        values.push(updates.durationMs);
      }
      if (updates.audioUrl !== undefined) {
        fields.push('audio_url = ?');
        values.push(updates.audioUrl);
      }
      if (updates.transcript !== undefined) {
        fields.push('transcript = ?');
        values.push(JSON.stringify(updates.transcript));
      }
      if (updates.roastReport !== undefined) {
        fields.push('roast_report = ?');
        values.push(JSON.stringify(updates.roastReport));
      }
      if (updates.tokenCount !== undefined) {
        fields.push('token_count = ?');
        values.push(updates.tokenCount);
      }

      if (fields.length === 0) return;

      values.push(sessionId);
      await connection.query(
        `UPDATE call_sessions SET ${fields.join(', ')} WHERE session_id = ?`,
        values
      );
    } finally {
      connection.release();
    }
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT * FROM call_sessions WHERE session_id = ?`,
        [sessionId]
      );
      
      const results = rows as any[];
      if (results.length === 0) return null;
      
      const row = results[0];
      return {
        id: row.id,
        sessionId: row.session_id,
        userId: row.user_id,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMs: row.duration_ms,
        audioUrl: row.audio_url,
        transcript: row.transcript ? JSON.parse(row.transcript) : undefined,
        roastReport: row.roast_report ? JSON.parse(row.roast_report) : undefined,
        tokenCount: row.token_count,
        createdAt: row.created_at,
      };
    } finally {
      connection.release();
    }
  }

  async getSessionsByUserId(userId: string, limit: number = 50): Promise<CallSession[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT * FROM call_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT ?`,
        [userId, limit]
      );
      
      const results = rows as any[];
      return results.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        userId: row.user_id,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMs: row.duration_ms,
        audioUrl: row.audio_url,
        transcript: row.transcript ? JSON.parse(row.transcript) : undefined,
        roastReport: row.roast_report ? JSON.parse(row.roast_report) : undefined,
        tokenCount: row.token_count,
        createdAt: row.created_at,
      }));
    } finally {
      connection.release();
    }
  }

  async logTokenUsage(sessionId: string, tokens: number): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update session token count
      await connection.query(
        `UPDATE call_sessions SET token_count = token_count + ? WHERE session_id = ?`,
        [tokens, sessionId]
      );
      
      // Update daily usage
      const today = new Date().toISOString().split('T')[0];
      await connection.query(
        `INSERT INTO daily_usage (date, token_count, session_count)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE 
         token_count = token_count + ?,
         session_count = session_count + 1`,
        [today, tokens, tokens]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async checkDailyUsage(): Promise<{ used: number; limit: number }> {
    const connection = await this.pool.getConnection();
    try {
      const today = new Date().toISOString().split('T')[0];
      const [rows] = await connection.query(
        `SELECT token_count FROM daily_usage WHERE date = ?`,
        [today]
      );
      
      const results = rows as any[];
      const used = results.length > 0 ? results[0].token_count : 0;
      const limit = config.costControl.dailyTokenLimit;
      
      return { used, limit };
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default DatabaseClient;
export type { CallSession, TranscriptSegment, RoastReport, BuzzwordAnalysis };

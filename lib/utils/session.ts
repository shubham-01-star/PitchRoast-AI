import { randomBytes } from 'crypto';

export function generateSecureSessionId(): string {
  // Generate cryptographically secure random session ID
  return randomBytes(32).toString('hex');
}

export function validateSessionId(sessionId: string): boolean {
  // Validate session ID format (64 hex characters)
  return /^[a-f0-9]{64}$/.test(sessionId);
}

export function getSessionFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  
  const sessionId = localStorage.getItem('pitchroast_session_id');
  const expiry = localStorage.getItem('pitchroast_session_expiry');
  
  if (!sessionId || !expiry) return null;
  
  // Check if expired (90 days)
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem('pitchroast_session_id');
    localStorage.removeItem('pitchroast_session_expiry');
    return null;
  }
  
  return sessionId;
}

export function setSessionInStorage(sessionId: string): void {
  if (typeof window === 'undefined') return;
  
  const expiryTime = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days
  
  localStorage.setItem('pitchroast_session_id', sessionId);
  localStorage.setItem('pitchroast_session_expiry', String(expiryTime));
}

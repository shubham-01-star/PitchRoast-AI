export class Logger {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  log(message: string, context?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level: 'info',
      message,
      context,
    };
    console.log(JSON.stringify(logEntry));
  }

  error(message: string, error?: any, context?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level: 'error',
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
    };
    console.error(JSON.stringify(logEntry));
  }

  warn(message: string, context?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level: 'warn',
      message,
      context,
    };
    console.warn(JSON.stringify(logEntry));
  }
}

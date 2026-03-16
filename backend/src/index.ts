import express from 'express';
import { WebSocketServer } from 'ws';
import { config } from './config';
import DatabaseClient from './lib/database';
import { WebSocketHandler } from './lib/websocket-handler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware for WebSocket
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sessions API endpoint
app.get('/api/sessions', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const db = new DatabaseClient();
    const sessions = await db.getSessionsByUserId(userId, 50);
    
    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Daily usage check endpoint
app.get('/api/usage/check', async (req, res) => {
  try {
    const db = new DatabaseClient();
    const usage = await db.checkDailyUsage();
    
    const isOverLimit = usage.used >= usage.limit;
    
    res.json({
      used: usage.used,
      limit: usage.limit,
      isOverLimit,
      message: isOverLimit 
        ? 'Daily usage limit exceeded. System in maintenance mode.'
        : 'Usage within limits',
    });
  } catch (error) {
    console.error('Error checking usage:', error);
    res.status(500).json({ error: 'Failed to check usage' });
  }
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Track active sessions
const activeSessions = new Map<string, WebSocketHandler>();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');

  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const userId = requestUrl.searchParams.get('userId') || undefined;

  // Create session handler
  const handler = new WebSocketHandler(ws, userId);
  const sessionId = handler.getSessionId();
  activeSessions.set(sessionId, handler);
  
  ws.on('close', () => {
    console.log(`Session ${sessionId} closed`);
    activeSessions.delete(sessionId);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  
  // Close all active WebSocket connections
  activeSessions.forEach((handler, sessionId) => {
    console.log(`Closing session ${sessionId}`);
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, wss };

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ConnectionStatus } from '../types';

export interface WebRTCState {
  status: ConnectionStatus;
  error: string | null;
}

export interface WebRTCConfig {
  wsUrl: string;
  connectionTimeout?: number;
}

function getConnectionErrorMessage(wsUrl: string) {
  if (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) {
    return `Unable to connect to the local Pitch Roast server at ${wsUrl}. Make sure the backend is running and try again.`;
  }

  return 'Unable to establish connection to the Pitch Roast server. Please try again in a moment.';
}

export function useWebRTC(config: WebRTCConfig) {
  const [state, setState] = useState<WebRTCState>({
    status: 'idle',
    error: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const connect = useCallback(async (stream: MediaStream) => {
    setState({ status: 'connecting', error: null });
    
    const timeout = config.connectionTimeout || 10000;
    
    connectionTimeoutRef.current = setTimeout(() => {
      // Use wsRef to check actual connection state, not stale closure
      if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
        const timeoutMessage = getConnectionErrorMessage(config.wsUrl);
        setState({
          status: 'error',
          error: timeoutMessage,
        });
        wsRef.current?.close();
      }
    }, timeout);
    
    return new Promise<WebSocket>((resolve, reject) => {
      try {
        const ws = new WebSocket(config.wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
          setState({ status: 'connected', error: null });
          resolve(ws);
        };

        ws.onerror = () => {
          if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
          const err = getConnectionErrorMessage(config.wsUrl);
          setState({ status: 'error', error: err });
          reject(new Error(err));
        };

        ws.onclose = () => {
          setState({ status: 'disconnected', error: null });
        };
      } catch (error) {
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        setState({ status: 'error', error: errorMessage });
        reject(error);
      }
    });
  }, [config.wsUrl, config.connectionTimeout]);

  const disconnect = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setState({ status: 'idle', error: null });
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}

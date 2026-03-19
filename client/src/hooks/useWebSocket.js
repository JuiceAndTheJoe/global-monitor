import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../utils/config.js';

function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.current), maxDelay);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, []);

  const connect = useCallback(() => {
    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }

    const wsUrl = WS_URL;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0; // Reset on successful connection
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Schedule reconnection with exponential backoff
        const delay = getReconnectDelay();
        reconnectAttempts.current++;
        console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'update' && onMessage) {
            onMessage(message);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      const delay = getReconnectDelay();
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }
  }, [getReconnectDelay, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Empty deps - connect on mount only

  // Method to manually reconnect (e.g., after network recovery)
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  return { connected, reconnect };
}

export default useWebSocket;

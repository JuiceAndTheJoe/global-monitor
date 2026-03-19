import { WebSocketServer } from 'ws';
import { WEBSOCKET_COMPRESSION_THRESHOLD } from './config.js';

let wss = null;
const clients = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({
    server,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      threshold: WEBSOCKET_COMPRESSION_THRESHOLD // Only compress messages > threshold
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`WebSocket client connected. Total: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`WebSocket client disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcast(layer, data) {
  // Skip if no clients connected
  if (clients.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'update',
    layer,
    data,
    timestamp: Date.now()
  });

  let sent = 0;
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
        sent++;
      } catch (err) {
        console.error('Failed to send to client:', err.message);
        clients.delete(client);
      }
    } else if (client.readyState === 3) { // CLOSED
      clients.delete(client);
    }
  }

  if (sent > 0) {
    console.log(`Broadcast ${layer}: ${sent} clients, ${data.length} items`);
  }
}

export function getClientCount() {
  return clients.size;
}

/**
 * Gracefully close all WebSocket connections
 * @param {number} code - WebSocket close code (default: 1001 - Going Away)
 * @param {string} reason - Close reason
 */
export function close(code = 1001, reason = 'Server shutting down') {
  console.log(`Closing ${clients.size} WebSocket connections...`);

  let closedCount = 0;
  for (const client of clients) {
    try {
      if (client.readyState === 1) { // OPEN
        client.close(code, reason);
        closedCount++;
      }
    } catch (err) {
      console.error('Error closing WebSocket client:', err.message);
    }
  }

  clients.clear();
  console.log(`Closed ${closedCount} WebSocket connections`);

  // Close the WebSocket server
  if (wss) {
    return new Promise((resolve) => {
      wss.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }

  return Promise.resolve();
}

export default { initWebSocket, broadcast, getClientCount, close };

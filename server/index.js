import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { initWebSocket, broadcast, getClientCount } from './websocket.js';
import flightsRouter from './routes/flights.js';
import earthquakesRouter from './routes/earthquakes.js';
import satellitesRouter from './routes/satellites.js';
import { getFlights } from './services/opensky.js';
import { getEarthquakes } from './services/usgs.js';
import { getSatellites } from './services/celestrak.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression()); // Gzip compression for HTTP responses
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/flights', flightsRouter);
app.use('/api/earthquakes', earthquakesRouter);
app.use('/api/satellites', satellitesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    clients: getClientCount()
  });
});

// Create HTTP server and attach WebSocket
const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available on ws://localhost:${PORT}`);
});

// Broadcast flight updates every 10 seconds (only if clients connected)
setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const flights = await getFlights();
    broadcast('flights', flights);
  } catch (error) {
    console.error('Error broadcasting flight updates:', error.message);
  }
}, 10000);

// Broadcast earthquake updates every 60 seconds (only if clients connected)
setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const earthquakes = await getEarthquakes();
    broadcast('earthquakes', earthquakes);
  } catch (error) {
    console.error('Error broadcasting earthquake updates:', error.message);
  }
}, 60000);

// Broadcast satellite updates every 60 seconds (reduced from 30s - satellites move slowly)
setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const satellites = await getSatellites();
    broadcast('satellites', satellites);
  } catch (error) {
    console.error('Error broadcasting satellite updates:', error.message);
  }
}, 60000);

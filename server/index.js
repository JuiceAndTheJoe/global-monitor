import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { initWebSocket, broadcast, getClientCount, close as closeWebSocket } from './websocket.js';
import flightsRouter from './routes/flights.js';
import earthquakesRouter from './routes/earthquakes.js';
import satellitesRouter from './routes/satellites.js';
import shipsRouter from './routes/ships.js';
import weatherRouter from './routes/weather.js';
import newsRouter from './routes/news.js';
import { getFlights } from './services/opensky.js';
import { getEarthquakes } from './services/usgs.js';
import { getSatellites } from './services/celestrak.js';
import { getShips } from './services/ships.js';
import { getWeather } from './services/weather.js';
import { getNews } from './services/news.js';
import { getStats as getCacheStats } from './services/cache.js';
import { getMetricsSummary } from './utils/metrics.js';
import { PORT, CORS_ORIGIN, FLIGHTS_INTERVAL, EARTHQUAKES_INTERVAL, SATELLITES_INTERVAL } from './config.js';

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Store interval IDs for graceful shutdown
const intervals = [];

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API server
  crossOriginEmbedderPolicy: false // Allow embedding in client app
}));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => req.path === '/api/health', // Skip rate limiting for health checks
  message: {
    type: 'error',
    timestamp: Date.now(),
    data: [],
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all API routes (except /api/health)
app.use('/api/', limiter);

// Middleware
app.use(compression()); // Gzip compression for HTTP responses
app.use(cors({
  origin: CORS_ORIGIN
}));
app.use(express.json());

// API Routes
app.use('/api/flights', flightsRouter);
app.use('/api/earthquakes', earthquakesRouter);
app.use('/api/satellites', satellitesRouter);
app.use('/api/ships', shipsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/news', newsRouter);

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const uptime = Date.now() - serverStartTime;
  const uptimeSeconds = Math.floor(uptime / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  const cacheStats = getCacheStats();
  const metrics = getMetricsSummary();
  const memUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: {
      ms: uptime,
      seconds: uptimeSeconds,
      minutes: uptimeMinutes,
      hours: uptimeHours,
      formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
    },
    websocket: {
      connections: getClientCount()
    },
    cache: {
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      utilization: Math.round((cacheStats.size / cacheStats.maxSize) * 100),
      hitRate: cacheStats.hitRate,
      stats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        evictions: cacheStats.evictions,
        totalRequests: cacheStats.totalRequests
      }
    },
    dataMetrics: metrics,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024) // MB
    }
  });
});

// Create HTTP server and attach WebSocket
const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available on ws://localhost:${PORT}`);
});

// Broadcast flight updates (configurable interval, default 10 seconds)
intervals.push(setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const flights = await getFlights();
    broadcast('flights', flights);
  } catch (error) {
    console.error('Error broadcasting flight updates:', error.message);
  }
}, FLIGHTS_INTERVAL));

// Broadcast earthquake updates (configurable interval, default 60 seconds)
intervals.push(setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const earthquakes = await getEarthquakes();
    broadcast('earthquakes', earthquakes);
  } catch (error) {
    console.error('Error broadcasting earthquake updates:', error.message);
  }
}, EARTHQUAKES_INTERVAL));

// Broadcast satellite updates (configurable interval, default 60 seconds)
intervals.push(setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const satellites = await getSatellites();
    broadcast('satellites', satellites);
  } catch (error) {
    console.error('Error broadcasting satellite updates:', error.message);
  }
}, SATELLITES_INTERVAL));

// Broadcast ship updates every 60 seconds (only if clients connected)
intervals.push(setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const ships = await getShips();
    broadcast('ships', ships);
  } catch (error) {
    console.error('Error broadcasting ship updates:', error.message);
  }
}, 60000));

// Broadcast weather updates every 120 seconds (only if clients connected)
// Weather changes slowly, so 2-minute interval is appropriate
intervals.push(setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const weather = await getWeather();
    broadcast('weather', weather);
  } catch (error) {
    console.error('Error broadcasting weather updates:', error.message);
  }
}, 120000));

// Broadcast news updates every 120 seconds (only if clients connected)
// GDELT updates every 15 minutes, so 2-minute check is reasonable
intervals.push(setInterval(async () => {
  if (getClientCount() === 0) return;

  try {
    const news = await getNews();
    broadcast('news', news);
  } catch (error) {
    console.error('Error broadcasting news updates:', error.message);
  }
}, 120000));

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new requests
  console.log('Stopping acceptance of new connections...');

  // Clear all intervals to stop background tasks
  console.log(`Clearing ${intervals.length} interval timers...`);
  intervals.forEach(interval => clearInterval(interval));
  intervals.length = 0;

  // Close WebSocket connections gracefully
  console.log('Closing WebSocket connections...');
  await closeWebSocket(1001, 'Server shutting down');

  // Close HTTP server
  console.log('Closing HTTP server...');
  await new Promise((resolve) => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
  });

  console.log('Graceful shutdown complete');
  process.exit(0);
}

// Register shutdown handlers for SIGTERM and SIGINT
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});

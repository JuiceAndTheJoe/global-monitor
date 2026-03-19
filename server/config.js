import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Parse integer from env with fallback to default
function parseIntEnv(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Server Configuration
export const PORT = parseIntEnv(process.env.PORT, 3001);

// CORS Configuration
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Data Update Intervals (milliseconds)
export const FLIGHTS_INTERVAL = parseIntEnv(process.env.FLIGHTS_INTERVAL, 10000);
export const EARTHQUAKES_INTERVAL = parseIntEnv(process.env.EARTHQUAKES_INTERVAL, 60000);
export const SATELLITES_INTERVAL = parseIntEnv(process.env.SATELLITES_INTERVAL, 60000);

// Cache Configuration
export const CACHE_MAX_SIZE = parseIntEnv(process.env.CACHE_MAX_SIZE, 100);
export const CACHE_CLEANUP_INTERVAL = parseIntEnv(process.env.CACHE_CLEANUP_INTERVAL, 60000);

// WebSocket Configuration
export const WEBSOCKET_COMPRESSION_THRESHOLD = parseIntEnv(process.env.WEBSOCKET_COMPRESSION_THRESHOLD, 1024);

// API Keys (for future services)
export const OPENSKY_USERNAME = process.env.OPENSKY_USERNAME || '';
export const OPENSKY_PASSWORD = process.env.OPENSKY_PASSWORD || '';
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
export const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
export const MARITIME_API_KEY = process.env.MARITIME_API_KEY || '';

// Export all config as default object
export default {
  PORT,
  CORS_ORIGIN,
  FLIGHTS_INTERVAL,
  EARTHQUAKES_INTERVAL,
  SATELLITES_INTERVAL,
  CACHE_MAX_SIZE,
  CACHE_CLEANUP_INTERVAL,
  WEBSOCKET_COMPRESSION_THRESHOLD,
  OPENSKY_USERNAME,
  OPENSKY_PASSWORD,
  WEATHER_API_KEY,
  NEWS_API_KEY,
  MARITIME_API_KEY
};

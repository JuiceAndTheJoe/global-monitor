// Environment-based configuration for production deployment

// API URL - uses environment variable in production, proxy in development
export const API_URL = import.meta.env.VITE_API_URL
  ? `https://${import.meta.env.VITE_API_URL}`
  : '';

// WebSocket URL - derives from API URL or uses local in development
export const WS_URL = import.meta.env.VITE_API_URL
  ? `wss://${import.meta.env.VITE_API_URL}`
  : `ws://${window.location.hostname}:3001`;

// Check if running in production
export const isProduction = import.meta.env.PROD;

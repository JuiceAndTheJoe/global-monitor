# Global Monitor Dashboard

Real-time world map displaying flights, earthquakes, and satellites as interactive dots.

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start development (server + client)
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Project Structure

```
global-monitor/
├── server/           # Express + WebSocket backend
│   ├── routes/       # API routes for each data layer
│   ├── services/     # API clients and caching
│   └── websocket.js  # Real-time updates
├── client/           # React + Vite frontend
│   └── src/
│       ├── components/  # Map, controls, popups
│       ├── layers/      # Flight, Earthquake, Satellite layers
│       ├── hooks/       # WebSocket and data hooks
│       └── utils/       # API helpers
└── package.json      # Monorepo root
```

## Data Sources

- **Flights**: OpenSky Network API
- **Earthquakes**: USGS Earthquake API
- **Satellites**: CelesTrak TLE data + satellite.js

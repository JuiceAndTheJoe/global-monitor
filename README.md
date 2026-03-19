# Global Monitor Dashboard

A real-time geopolitical monitoring dashboard displaying flights, earthquakes, satellites, maritime traffic, weather alerts, and global news events on an interactive world map.

![Dashboard Preview](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### Data Layers

| Layer | Source | Update Interval | Description |
|-------|--------|-----------------|-------------|
| ✈️ **Flights** | OpenSky Network | 10 seconds | Real-time aircraft positions with altitude coloring and heading rotation |
| 🌍 **Earthquakes** | USGS | 60 seconds | Seismic events sized by magnitude, colored by recency |
| 🛰️ **Satellites** | CelesTrak | 60 seconds | ISS, Starlink, GPS, and weather satellites with orbital tracking |
| 🚢 **Ships** | AIS Simulation | 60 seconds | Maritime traffic on major shipping lanes (Suez, Panama, Malacca, etc.) |
| ⛈️ **Weather** | NWS / OpenWeatherMap | 120 seconds | Severe weather alerts with severity coloring and polygon overlays |
| 📰 **News** | GDELT GEO 2.0 | 120 seconds | Geolocated events (conflicts, protests, disasters) with sentiment analysis |

### Dashboard Features

- **Real-time Updates**: WebSocket-powered live data streaming
- **Marker Clustering**: Automatically groups dense markers for better performance
- **Analytics Panel**: Collapsible sidebar with real-time statistics and mini charts
- **Layer Controls**: Toggle individual data layers on/off
- **Connection Status**: Live indicator showing WebSocket connection health
- **Dark Theme**: Professional dark map tiles (CartoDB Dark Matter)

### Technical Features

- **Security**: Helmet.js headers, rate limiting (100 req/15min), input validation (Zod)
- **Performance**: In-memory caching, request deduplication, memoized React components
- **Reliability**: Graceful shutdown, auto-reconnection with exponential backoff
- **Monitoring**: Enhanced health endpoint with uptime, memory usage, and service metrics

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start development (server + client)
npm run dev
```

- **Dashboard**: http://localhost:5173
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## Configuration

Copy the environment template and customize as needed:

```bash
cp server/.env.example server/.env
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `CORS_ORIGIN` | * | Allowed CORS origins |
| `FLIGHTS_INTERVAL` | 10000 | Flight broadcast interval (ms) |
| `EARTHQUAKES_INTERVAL` | 60000 | Earthquake broadcast interval (ms) |
| `SATELLITES_INTERVAL` | 60000 | Satellite broadcast interval (ms) |
| `CACHE_MAX_SIZE` | 100 | Maximum cache entries |
| `OPENWEATHER_API_KEY` | - | Optional: Enables global storm data |

## Project Structure

```
global-monitor/
├── server/                    # Express + WebSocket backend
│   ├── index.js              # Main server with graceful shutdown
│   ├── config.js             # Environment configuration
│   ├── websocket.js          # WebSocket manager
│   ├── routes/
│   │   ├── flights.js        # GET /api/flights
│   │   ├── earthquakes.js    # GET /api/earthquakes
│   │   ├── satellites.js     # GET /api/satellites
│   │   ├── ships.js          # GET /api/ships
│   │   ├── weather.js        # GET /api/weather
│   │   └── news.js           # GET /api/news
│   ├── services/
│   │   ├── cache.js          # In-memory LRU cache with TTL
│   │   ├── opensky.js        # OpenSky Network API client
│   │   ├── usgs.js           # USGS Earthquake API client
│   │   ├── celestrak.js      # CelesTrak TLE + SGP4 propagation
│   │   ├── ships.js          # Maritime traffic simulation
│   │   ├── weather.js        # NWS + OpenWeatherMap client
│   │   └── news.js           # GDELT GEO 2.0 client
│   ├── utils/
│   │   ├── validation.js     # Zod schemas for input validation
│   │   └── metrics.js        # Service health tracking
│   └── .env.example          # Environment template
├── client/                    # React + Vite frontend
│   ├── index.html            # Entry HTML with Leaflet CSS
│   ├── vite.config.js        # Vite config with API proxy
│   └── src/
│       ├── App.jsx           # Main app with layer state
│       ├── App.css           # Global styles (dark theme)
│       ├── components/
│       │   ├── Map.jsx           # Leaflet map container
│       │   ├── LayerControls.jsx # Layer toggle panel
│       │   ├── InfoPopup.jsx     # Marker popup content
│       │   └── AnalyticsPanel.jsx # Statistics sidebar
│       ├── layers/
│       │   ├── FlightsLayer.jsx      # Aircraft markers
│       │   ├── EarthquakesLayer.jsx  # Seismic event markers
│       │   ├── SatellitesLayer.jsx   # Orbital object markers
│       │   ├── ShipsLayer.jsx        # Maritime vessel markers
│       │   ├── WeatherLayer.jsx      # Weather alert markers
│       │   └── NewsLayer.jsx         # News event markers
│       ├── hooks/
│       │   ├── useWebSocket.js   # WebSocket with auto-reconnect
│       │   └── useLayerData.js   # Data fetching + streaming
│       └── utils/
│           └── api.js            # HTTP API client
└── package.json               # Monorepo root with workspaces
```

## API Reference

### REST Endpoints

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/flights` | GET | Aircraft positions | `lamin`, `lomin`, `lamax`, `lomax` (bounding box) |
| `/api/earthquakes` | GET | Seismic events | `minmag`, `maxmag` (magnitude filter) |
| `/api/satellites` | GET | Satellite positions | `category` (iss, starlink, gps, weather) |
| `/api/ships` | GET | Maritime vessels | - |
| `/api/weather` | GET | Weather alerts | - |
| `/api/news` | GET | Geopolitical events | `type`, `mintone`, `maxtone` |
| `/api/health` | GET | Server health status | - |

### WebSocket

Connect to `ws://localhost:3001` to receive real-time updates:

```javascript
// Message format
{
  "type": "update",
  "layer": "flights" | "earthquakes" | "satellites" | "ships" | "weather" | "news",
  "data": [...],
  "timestamp": 1234567890
}
```

### Health Endpoint Response

```json
{
  "status": "healthy",
  "uptime": {
    "ms": 123456,
    "formatted": "0d 0h 2m 3s"
  },
  "websocket": {
    "connections": 2
  },
  "cache": {
    "size": 15,
    "maxSize": 100,
    "hitRate": "85.50%"
  },
  "metrics": {
    "flights": { "successRate": "100.00%", "lastSuccess": "2024-01-01T12:00:00Z" },
    "earthquakes": { "successRate": "100.00%", "lastSuccess": "2024-01-01T12:00:00Z" }
  },
  "memory": {
    "heapUsed": "45.23 MB",
    "heapTotal": "65.00 MB"
  }
}
```

## Data Sources

| Source | API | Authentication | Rate Limits |
|--------|-----|----------------|-------------|
| [OpenSky Network](https://opensky-network.org/apidoc/) | REST | None (public) | 100/day unauthenticated |
| [USGS Earthquake](https://earthquake.usgs.gov/fdsnws/event/1/) | REST | None | Unlimited |
| [CelesTrak](https://celestrak.org/NORAD/elements/) | TLE files | None | Unlimited |
| [NWS Weather](https://www.weather.gov/documentation/services-web-api) | REST | None | Unlimited |
| [GDELT GEO 2.0](https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/) | REST | None | Unlimited |
| [OpenWeatherMap](https://openweathermap.org/api) | REST | API Key (optional) | 1000/day free tier |

## Technology Stack

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Real-time**: WebSocket (ws) with compression
- **Security**: Helmet, express-rate-limit, Zod
- **Orbital Mechanics**: satellite.js (SGP4 propagation)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Mapping**: Leaflet + React-Leaflet
- **Clustering**: leaflet.markercluster + react-leaflet-cluster
- **State**: React hooks (no external state library)

## Security

- **HTTP Headers**: Helmet.js provides XSS protection, clickjacking prevention, etc.
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Input Validation**: All query parameters validated with Zod schemas
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT signals

## Performance Optimizations

### Server
- In-memory LRU cache with TTL
- Request deduplication for concurrent API calls
- Conditional WebSocket broadcasting (only when clients connected)
- Gzip compression for HTTP responses
- Per-message deflate for WebSocket

### Client
- React.memo for all layer components
- Icon caching (flights, ships)
- Marker clustering for dense areas
- No polling (WebSocket-only updates)

## Development

```bash
# Install all dependencies
npm run install:all

# Start both server and client
npm run dev

# Start server only
npm run dev:server

# Start client only
npm run dev:client
```

## Production Deployment

```bash
# Build client
cd client && npm run build

# Start server with production settings
NODE_ENV=production node server/index.js
```

Recommended: Use a process manager (PM2) or containerize with Docker.

## Roadmap

- [ ] Real AIS maritime data (MarineTraffic API)
- [ ] User authentication (JWT)
- [ ] Historical data playback (PostgreSQL + PostGIS)
- [ ] Custom geofencing alerts
- [ ] 3D globe view (Cesium.js)
- [ ] Mobile responsive design
- [ ] Docker deployment configuration

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built for global situational awareness and geopolitical monitoring.

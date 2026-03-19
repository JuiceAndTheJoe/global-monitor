# Global Monitor Dashboard - Architecture Document

> Technical architecture documentation for the real-time geopolitical monitoring dashboard.

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Data Flow](#data-flow)
4. [Server Architecture](#server-architecture)
5. [Client Architecture](#client-architecture)
6. [Real-Time Communication](#real-time-communication)
7. [Caching Strategy](#caching-strategy)
8. [Security Architecture](#security-architecture)
9. [Performance Optimizations](#performance-optimizations)
10. [Error Handling](#error-handling)
11. [Deployment Considerations](#deployment-considerations)

---

## System Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js (ES Modules) | Server-side JavaScript |
| **Server Framework** | Express.js | HTTP API and middleware |
| **Real-time** | WebSocket (ws) | Bidirectional streaming |
| **Frontend Framework** | React 18 | Component-based UI |
| **Build Tool** | Vite 5 | Fast development and bundling |
| **Mapping** | Leaflet + React-Leaflet | Interactive map visualization |
| **Clustering** | leaflet.markercluster | Marker grouping |
| **Validation** | Zod | Runtime type checking |
| **Security** | Helmet.js | HTTP security headers |

### Monorepo Structure

```
global-monitor/
├── package.json          # Workspace root (npm workspaces)
├── server/               # Backend workspace
│   ├── package.json      # Server dependencies
│   └── index.js          # Entry point
└── client/               # Frontend workspace
    ├── package.json      # Client dependencies
    └── src/              # React application
```

**Benefits:**
- Independent versioning and deployment
- Shared development scripts (`npm run dev` starts both)
- Clear separation of concerns
- Can be split into separate repos if needed

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL APIs                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ OpenSky  │ │   USGS   │ │CelesTrak │ │   NWS    │ │  GDELT   │      │
│  │ (Flights)│ │ (Quakes) │ │(Satellites)│ │(Weather) │ │ (News)   │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
└───────┼────────────┼────────────┼────────────┼────────────┼─────────────┘
        │            │            │            │            │
        └────────────┴────────────┴────────────┴────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Express + WS)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Middleware Pipeline                         │   │
│  │  Helmet → Compression → CORS → JSON Parser → Rate Limiter       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│  ┌───────────────────────────────┴───────────────────────────────┐     │
│  │                        Route Handlers                          │     │
│  │  /api/flights  /api/earthquakes  /api/satellites  /api/ships  │     │
│  │  /api/weather  /api/news  /api/health                         │     │
│  └───────────────────────────────┬───────────────────────────────┘     │
│                                  │                                      │
│  ┌───────────────────────────────┴───────────────────────────────┐     │
│  │                       Service Layer                            │     │
│  │  ┌─────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐ │     │
│  │  │ Cache   │  │ API Clients │  │ Transforms │  │  Metrics  │ │     │
│  │  │ (LRU)   │  │ (fetch)     │  │ (normalize)│  │ (tracking)│ │     │
│  │  └─────────┘  └─────────────┘  └────────────┘  └───────────┘ │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                  │                                      │
│  ┌───────────────────────────────┴───────────────────────────────┐     │
│  │                    WebSocket Server                            │     │
│  │  • Client tracking (Set)                                       │     │
│  │  • Broadcast intervals (10s-120s)                              │     │
│  │  • Per-message deflate compression                             │     │
│  └───────────────────────────────┬───────────────────────────────┘     │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │      HTTP + WebSocket       │
                    │   REST (initial load)       │
                    │   WS (real-time updates)    │
                    └──────────────┬──────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                           CLIENT (React + Vite)                          │
│  ┌───────────────────────────────┴───────────────────────────────┐     │
│  │                      Custom Hooks                              │     │
│  │  useWebSocket (connection)    useLayerData (state)            │     │
│  └───────────────────────────────┬───────────────────────────────┘     │
│                                  │                                      │
│  ┌───────────────────────────────┴───────────────────────────────┐     │
│  │                      Component Tree                            │     │
│  │  App.jsx                                                       │     │
│  │  ├── Map.jsx (Leaflet container)                              │     │
│  │  │   ├── FlightsLayer.jsx + MarkerClusterGroup                │     │
│  │  │   ├── EarthquakesLayer.jsx                                 │     │
│  │  │   ├── SatellitesLayer.jsx                                  │     │
│  │  │   ├── ShipsLayer.jsx                                       │     │
│  │  │   ├── WeatherLayer.jsx                                     │     │
│  │  │   └── NewsLayer.jsx                                        │     │
│  │  ├── AnalyticsPanel.jsx                                       │     │
│  │  └── LayerControls.jsx                                        │     │
│  └───────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Phase 1: Initial Load (REST)

```
User opens browser
        │
        ▼
┌───────────────────┐
│  useLayerData     │ ──── Promise.all([
│  hook mounts      │        fetchFlights(),
└───────┬───────────┘        fetchEarthquakes(),
        │                    fetchSatellites(),
        │                    fetchShips(),
        │                    fetchWeather(),
        │                    fetchNews()
        ▼                  ])
┌───────────────────┐
│  HTTP GET         │
│  /api/{layer}     │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  Server Route     │ ──── Validation middleware
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  Service Layer    │ ──── 1. Check cache (hit → return)
└───────┬───────────┘      2. Fetch external API
        │                  3. Transform data
        │                  4. Update cache
        ▼                  5. Return data
┌───────────────────┐
│  JSON Response    │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  React setState   │ ──── Triggers re-render
└───────────────────┘
```

### Phase 2: Real-Time Updates (WebSocket)

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVER BROADCAST LOOP                     │
│                                                              │
│   setInterval(() => {                                        │
│     if (getClientCount() === 0) return; // Skip if no clients│
│     const data = await getFlights();                         │
│     broadcast('flights', data);                              │
│   }, 10000);                                                 │
│                                                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  WebSocket.send()    │
               │  { type: 'update',   │
               │    layer: 'flights', │
               │    data: [...],      │
               │    timestamp: ... }  │
               └──────────┬───────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT MESSAGE HANDLER                    │
│                                                              │
│   ws.onmessage = (event) => {                               │
│     const { layer, data } = JSON.parse(event.data);         │
│     switch (layer) {                                         │
│       case 'flights': setFlights(data); break;              │
│       case 'earthquakes': setEarthquakes(data); break;      │
│       // ...                                                 │
│     }                                                        │
│   };                                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Broadcast Intervals

| Layer | Interval | Rationale |
|-------|----------|-----------|
| Flights | 10s | Aircraft move ~100m/s, need frequent updates |
| Earthquakes | 60s | USGS updates approximately every minute |
| Satellites | 60s | Orbital positions change slowly |
| Ships | 60s | Maritime traffic moves slowly (~20 knots) |
| Weather | 120s | Weather phenomena evolve over minutes/hours |
| News | 120s | GDELT updates every 15 minutes |

---

## Server Architecture

### Directory Structure

```
server/
├── index.js              # Main entry point
│                         # - Express app setup
│                         # - Middleware pipeline
│                         # - Route registration
│                         # - Broadcast intervals
│                         # - Graceful shutdown
│
├── config.js             # Environment configuration
│                         # - Loads .env via dotenv
│                         # - Exports typed config object
│
├── websocket.js          # WebSocket server
│                         # - Client connection tracking
│                         # - Broadcast function
│                         # - Compression settings
│                         # - Graceful close method
│
├── routes/
│   ├── flights.js        # GET /api/flights
│   ├── earthquakes.js    # GET /api/earthquakes
│   ├── satellites.js     # GET /api/satellites
│   ├── ships.js          # GET /api/ships
│   ├── weather.js        # GET /api/weather
│   └── news.js           # GET /api/news
│
├── services/
│   ├── cache.js          # In-memory LRU cache
│   ├── opensky.js        # OpenSky Network API client
│   ├── usgs.js           # USGS Earthquake API client
│   ├── celestrak.js      # CelesTrak TLE + SGP4 propagation
│   ├── ships.js          # Maritime traffic simulation
│   ├── weather.js        # NWS + OpenWeatherMap client
│   └── news.js           # GDELT GEO 2.0 client
│
├── utils/
│   ├── validation.js     # Zod schemas + middleware
│   └── metrics.js        # Service health tracking
│
└── .env.example          # Environment template
```

### Middleware Pipeline

```javascript
// Execution order (left to right)
Request → Helmet → Compression → CORS → JSON Parser → Rate Limiter → Route Handler → Response
```

| Middleware | Purpose |
|------------|---------|
| `helmet()` | Security headers (XSS, clickjacking prevention) |
| `compression()` | Gzip response compression |
| `cors()` | Cross-origin request handling |
| `express.json()` | JSON body parsing |
| `rateLimit()` | 100 requests / 15 min per IP |

### Service Layer Pattern

Each data service follows a consistent architecture:

```javascript
// Typical service structure (e.g., opensky.js)

// 1. Configuration
const API_URL = 'https://opensky-network.org/api/states/all';
const CACHE_KEY = 'flights';
const CACHE_TTL = 15; // seconds

// 2. Rate limiting state
let rateLimitedUntil = 0;
let consecutiveErrors = 0;

// 3. Request deduplication
let inflightRequest = null;

// 4. Main fetch function
export async function getFlights(bbox) {
  // Check rate limit
  if (Date.now() < rateLimitedUntil) {
    return cache.get(CACHE_KEY) || [];
  }

  // Check cache
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  // Deduplicate concurrent requests
  if (inflightRequest) {
    await inflightRequest;
    return cache.get(CACHE_KEY) || [];
  }

  // Fetch from external API
  inflightRequest = fetchFromAPI();
  try {
    const data = await inflightRequest;
    cache.set(CACHE_KEY, data, CACHE_TTL);
    recordSuccess('flights');
    return data;
  } catch (error) {
    recordFailure('flights');
    return cache.get(CACHE_KEY) || []; // Stale-while-error
  } finally {
    inflightRequest = null;
  }
}
```

### Response Format

All API endpoints return a consistent JSON structure:

```json
{
  "type": "flights",
  "timestamp": 1710856123456,
  "data": [
    {
      "id": "abc123",
      "coordinates": [-122.4194, 37.7749],
      "properties": {
        "callsign": "UAL123",
        "altitude": 10668,
        "velocity": 250
      }
    }
  ],
  "error": null
}
```

---

## Client Architecture

### Directory Structure

```
client/src/
├── main.jsx              # React entry point
├── App.jsx               # Root component
│                         # - Layer state management
│                         # - Data hook integration
│                         # - Component composition
│
├── App.css               # Global styles
│                         # - Dark theme
│                         # - Layer colors
│                         # - Cluster styles
│                         # - Panel animations
│
├── components/
│   ├── Map.jsx           # Leaflet container
│   ├── LayerControls.jsx # Toggle checkboxes
│   ├── InfoPopup.jsx     # Marker popup content
│   └── AnalyticsPanel.jsx# Statistics sidebar
│
├── layers/
│   ├── FlightsLayer.jsx      # Aircraft markers
│   ├── EarthquakesLayer.jsx  # Seismic markers
│   ├── SatellitesLayer.jsx   # Orbital markers
│   ├── ShipsLayer.jsx        # Maritime markers
│   ├── WeatherLayer.jsx      # Weather alerts
│   └── NewsLayer.jsx         # News events
│
├── hooks/
│   ├── useWebSocket.js   # Connection management
│   └── useLayerData.js   # Data orchestration
│
└── utils/
    └── api.js            # HTTP client functions
```

### Component Hierarchy

```
<App>
├── <Map>                           # Leaflet MapContainer
│   ├── <TileLayer>                 # CartoDB Dark Matter
│   ├── <FlightsLayer>              # Conditional render
│   │   └── <MarkerClusterGroup>    # Clustering wrapper
│   │       └── <FlightMarker> × N  # Memoized markers
│   ├── <EarthquakesLayer>
│   ├── <SatellitesLayer>
│   ├── <ShipsLayer>
│   ├── <WeatherLayer>
│   └── <NewsLayer>
├── <AnalyticsPanel>                # Collapsible sidebar
│   ├── <FlightStats>               # useMemo computed
│   ├── <EarthquakeStats>
│   ├── <SatelliteStats>
│   ├── <ShipStats>
│   └── <WeatherStats>
├── <LayerControls>                 # Toggle panel
│   └── <Checkbox> × 6              # Layer toggles
└── <ConnectionStatus>              # Live/Reconnecting
```

### State Management

**No external state library** - Pure React hooks:

```javascript
// App.jsx - Layer visibility state
const [layers, setLayers] = useState({
  flights: true,
  earthquakes: true,
  satellites: true,
  ships: true,
  weather: true,
  news: true
});

// useLayerData.js - Data state
const [flights, setFlights] = useState([]);
const [earthquakes, setEarthquakes] = useState([]);
// ... per-layer state

// State flow: useLayerData → App → Layer components (props)
```

### Hooks Architecture

#### useWebSocket

```javascript
function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(getWebSocketUrl());

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        onMessage(data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      scheduleReconnect();
    };
  }, [onMessage]);

  return { connected, reconnect: connect };
}
```

#### useLayerData

```javascript
function useLayerData() {
  const [flights, setFlights] = useState([]);
  // ... other layer states
  const [loading, setLoading] = useState(true);

  const handleMessage = useCallback((message) => {
    switch (message.layer) {
      case 'flights': setFlights(message.data); break;
      case 'earthquakes': setEarthquakes(message.data); break;
      // ...
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  // Initial REST fetch
  useEffect(() => {
    Promise.all([
      fetchFlights(),
      fetchEarthquakes(),
      // ...
    ]).then(([flights, earthquakes, ...]) => {
      setFlights(flights);
      setEarthquakes(earthquakes);
      setLoading(false);
    });
  }, []);

  return { flights, earthquakes, ..., loading, connected };
}
```

---

## Real-Time Communication

### WebSocket Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    CONNECTION LIFECYCLE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CONNECT                                                  │
│     Client: new WebSocket('ws://localhost:3001')            │
│     Server: clients.add(ws)                                  │
│                                                              │
│  2. STREAMING                                                │
│     Server: setInterval → broadcast(layer, data)            │
│     Client: ws.onmessage → setState                         │
│                                                              │
│  3. DISCONNECT                                               │
│     Server: clients.delete(ws)                               │
│     Client: scheduleReconnect()                              │
│                                                              │
│  4. RECONNECT                                                │
│     Client: exponential backoff (1s → 30s max)              │
│     Client: jitter (±1000ms random)                          │
│     Client: max 10 attempts                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Reconnection Strategy

**Exponential Backoff with Jitter:**

```
Attempt 1:  1000ms  + random(0-1000ms) = 1000-2000ms
Attempt 2:  2000ms  + random(0-1000ms) = 2000-3000ms
Attempt 3:  4000ms  + random(0-1000ms) = 4000-5000ms
Attempt 4:  8000ms  + random(0-1000ms) = 8000-9000ms
Attempt 5:  16000ms + random(0-1000ms) = 16000-17000ms
Attempt 6+: 30000ms + random(0-1000ms) = 30000-31000ms (capped)
```

**Why jitter?**
- Prevents thundering herd on server restart
- Spreads reconnection load over time
- Reduces network congestion spikes

### Message Protocol

**Server → Client:**

```json
{
  "type": "update",
  "layer": "flights",
  "data": [...],
  "timestamp": 1710856123456
}
```

**Compression:**
- Per-message deflate enabled
- Threshold: 1024 bytes (messages <1KB sent uncompressed)
- Compression level: 3 (balanced speed/ratio)

---

## Caching Strategy

### Three-Tier Caching

```
┌─────────────────────────────────────────────────────────────┐
│                     CACHING LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TIER 1: Server In-Memory Cache (cache.js)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • LRU eviction (max 100 entries)                     │  │
│  │  • TTL-based expiration (15s - 150s per layer)        │  │
│  │  • Periodic cleanup (60s interval)                    │  │
│  │  • Statistics tracking (hits, misses, evictions)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  TIER 2: Request Deduplication (per-service)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • In-flight request tracking                         │  │
│  │  • Promise-based coordination                         │  │
│  │  • Prevents concurrent identical API calls            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  TIER 3: Client-Side Memoization                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Icon caching (flight heading/altitude buckets)     │  │
│  │  • React.memo for layer components                    │  │
│  │  • useMemo for analytics computations                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cache TTL Configuration

| Layer | TTL | Broadcast Interval | Buffer |
|-------|-----|-------------------|--------|
| Flights | 15s | 10s | 5s |
| Earthquakes | 75s | 60s | 15s |
| Satellites | 75s | 60s | 15s |
| Ships | 75s | 60s | 15s |
| Weather | 150s | 120s | 30s |
| News | 150s | 120s | 30s |

### Cache Statistics

```javascript
// Tracked metrics
{
  hits: 1234,        // Cache hit count
  misses: 56,        // Cache miss count
  evictions: 12,     // LRU eviction count
  size: 45,          // Current entries
  maxSize: 100,      // Max entries
  hitRate: "95.67%"  // Computed hit rate
}
```

---

## Security Architecture

### Defense Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LAYER 1: HTTP Security Headers (Helmet.js)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • X-DNS-Prefetch-Control: off                        │  │
│  │  • X-Frame-Options: SAMEORIGIN                        │  │
│  │  • X-Content-Type-Options: nosniff                    │  │
│  │  • X-XSS-Protection: 1; mode=block                    │  │
│  │  • Strict-Transport-Security (HTTPS)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  LAYER 2: Rate Limiting                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • 100 requests per 15 minutes per IP                 │  │
│  │  • Sliding window algorithm                           │  │
│  │  • Standard RateLimit-* headers                       │  │
│  │  • 429 response on violation                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  LAYER 3: Input Validation (Zod)                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Bounding box: lat (-90 to 90), lon (-180 to 180)   │  │
│  │  • Magnitude: 0 to 10, min <= max                     │  │
│  │  • Category: enum (iss, starlink, gps, weather)       │  │
│  │  • 400 response with error message on failure         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  LAYER 4: CORS                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  • Configurable origin (default: *)                   │  │
│  │  • Production: restrict to specific domains           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Validation Example

```javascript
// Zod schema for bounding box
const boundingBoxSchema = z.object({
  lamin: z.string().optional().refine(
    (val) => !val || (parseFloat(val) >= -90 && parseFloat(val) <= 90),
    { message: 'lamin must be between -90 and 90' }
  ),
  lamax: z.string().optional().refine(/* similar */),
  lomin: z.string().optional().refine(
    (val) => !val || (parseFloat(val) >= -180 && parseFloat(val) <= 180),
    { message: 'lomin must be between -180 and 180' }
  ),
  lomax: z.string().optional().refine(/* similar */)
}).refine(
  (data) => {
    if (data.lamin && data.lamax) {
      return parseFloat(data.lamin) <= parseFloat(data.lamax);
    }
    return true;
  },
  { message: 'lamin must be <= lamax' }
);
```

---

## Performance Optimizations

### Server-Side

| Optimization | Impact | Implementation |
|--------------|--------|----------------|
| **In-memory caching** | 80-90% fewer API calls | LRU cache with TTL |
| **Request deduplication** | Eliminates duplicate fetches | Promise tracking |
| **Conditional broadcasting** | Zero work when idle | Client count check |
| **Gzip compression** | 70-90% smaller responses | compression middleware |
| **WebSocket compression** | 60% smaller messages | per-message deflate |
| **Exponential backoff** | Prevents API hammering | Adaptive retry delays |

### Client-Side

| Optimization | Impact | Implementation |
|--------------|--------|----------------|
| **React.memo** | Prevents unnecessary re-renders | Custom equality checks |
| **Icon caching** | 90% fewer icon creations | Map-based cache with buckets |
| **useMemo** | Avoids expensive recomputation | Dependency-based memoization |
| **Marker clustering** | 25x fewer DOM nodes | MarkerClusterGroup |
| **No polling** | Zero unnecessary requests | WebSocket push-only |
| **Chunked loading** | Non-blocking renders | Async marker rendering |

### Rendering Optimization Details

```javascript
// Icon caching (FlightsLayer.jsx)
const iconCache = new Map();

function getPlaneIcon(heading, altitude) {
  // Bucket to reduce cache entries
  // 360 headings × 12 altitudes = 4,320 combinations
  // Bucketed: 36 × 12 = 432 combinations (90% reduction)
  const key = `${Math.round(heading / 10) * 10}-${Math.round(altitude / 1000)}`;

  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      html: `<span style="transform: rotate(${heading}deg)">✈</span>`,
      className: 'flight-marker'
    }));
  }

  return iconCache.get(key);
}
```

---

## Error Handling

### Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING LAYERS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SERVICE LAYER                                               │
│  ├── API errors → Exponential backoff + stale cache         │
│  ├── Rate limits → Respect Retry-After header               │
│  └── Timeouts → Return cached data                          │
│                                                              │
│  ROUTE LAYER                                                 │
│  ├── Validation errors → 400 + error message                │
│  └── Service errors → 500 + empty data array                │
│                                                              │
│  PROCESS LAYER                                               │
│  ├── Uncaught exceptions → Log + graceful shutdown          │
│  └── Unhandled rejections → Log (continue running)          │
│                                                              │
│  CLIENT LAYER                                                │
│  ├── Fetch errors → Log + empty state                       │
│  ├── WebSocket errors → Automatic reconnection              │
│  └── Render errors → Error boundary (recommended)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Stale-While-Error Pattern

```javascript
try {
  const data = await fetchExternalAPI();
  cache.set(key, data, TTL);
  return data;
} catch (error) {
  console.error('API error:', error);

  // Return stale cached data instead of failing
  const staleData = cache.get(key);
  if (staleData) {
    console.log('Returning stale cache');
    return staleData;
  }

  // No cache available, return empty
  return [];
}
```

---

## Deployment Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to specific domain
- [ ] Set up HTTPS (required for secure WebSocket)
- [ ] Use process manager (PM2 or systemd)
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring/alerting on `/api/health`
- [ ] Add API keys for rate-limited services

### Scaling Options

```
┌─────────────────────────────────────────────────────────────┐
│                    SCALING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  OPTION 1: Vertical Scaling                                  │
│  • Increase Node.js memory limit                            │
│  • More CPU cores (cluster mode)                            │
│                                                              │
│  OPTION 2: Horizontal Scaling                                │
│  • Load balancer (nginx, HAProxy)                           │
│  • Sticky sessions for WebSocket                            │
│  • Redis for shared cache                                    │
│  • Redis Pub/Sub for broadcast coordination                  │
│                                                              │
│  OPTION 3: Edge Deployment                                   │
│  • CDN for static assets                                     │
│  • Edge caching for REST responses                           │
│  • Regional WebSocket servers                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Health Monitoring

The `/api/health` endpoint provides:

```json
{
  "status": "healthy",
  "uptime": {
    "ms": 3600000,
    "formatted": "0d 1h 0m 0s"
  },
  "websocket": {
    "connections": 5
  },
  "cache": {
    "size": 23,
    "maxSize": 100,
    "hitRate": "94.50%"
  },
  "metrics": {
    "flights": {
      "successRate": "99.50%",
      "lastSuccess": "2024-01-01T12:00:00Z"
    }
  },
  "memory": {
    "heapUsed": "45.23 MB",
    "heapTotal": "65.00 MB"
  }
}
```

---

## Appendix: Key File References

| File | Purpose |
|------|---------|
| `server/index.js` | Main server, middleware, intervals, shutdown |
| `server/config.js` | Environment configuration |
| `server/websocket.js` | WebSocket server implementation |
| `server/services/cache.js` | LRU cache with statistics |
| `server/services/opensky.js` | API client pattern example |
| `server/utils/validation.js` | Zod schemas and middleware |
| `server/utils/metrics.js` | Service health tracking |
| `client/src/App.jsx` | Root component, state management |
| `client/src/hooks/useWebSocket.js` | Connection lifecycle |
| `client/src/hooks/useLayerData.js` | Data orchestration |
| `client/src/layers/FlightsLayer.jsx` | Rendering pattern example |

---

*Last updated: March 2025*

# Changelog

All notable changes to the Global Monitor Dashboard are documented in this file.

## [2.0.0] - 2025-03-19

### Added

#### New Data Layers
- **Ships Layer**: Maritime traffic simulation on major shipping lanes (Suez Canal, Panama Canal, Strait of Malacca, English Channel, etc.)
  - 5 ship types with distinct icons: cargo, tanker, passenger, container, military
  - Realistic ship movement along actual shipping routes
  - Detailed popups with vessel information

- **Weather Layer**: Severe weather alerts and storm tracking
  - Integration with NWS (National Weather Service) API for US coverage
  - Optional OpenWeatherMap integration for global storm data
  - Severity-based coloring (emergency, warning, watch, advisory)
  - Polygon overlays showing affected areas

- **News Layer**: Geolocated geopolitical events
  - GDELT GEO 2.0 API integration (free, no API key required)
  - Event categorization: conflicts, protests, disasters, political events
  - Sentiment analysis with tone-based coloring
  - Significance scoring for event prioritization

#### Security Enhancements
- **Helmet.js**: Security headers (XSS protection, clickjacking prevention, content-type sniffing)
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Input Validation**: Zod schemas for all query parameters
  - Bounding box validation (lat/lon ranges)
  - Magnitude range validation
  - Category enumeration validation

#### Infrastructure
- **Environment Configuration**: Centralized config system with dotenv
  - `.env.example` template with all configurable values
  - `config.js` module with type-safe defaults
  - No more hardcoded values in source code

- **Graceful Shutdown**: Production-ready server lifecycle management
  - SIGTERM/SIGINT signal handlers
  - Proper cleanup of intervals and WebSocket connections
  - Uncaught exception and unhandled rejection handlers

- **Health Monitoring**: Enhanced `/api/health` endpoint
  - Server uptime tracking
  - WebSocket connection count
  - Cache statistics (size, hit rate, evictions)
  - Per-service metrics (success/failure counts, last fetch times)
  - Memory usage reporting

#### UI/UX Enhancements
- **Marker Clustering**: Automatic grouping of dense markers
  - Layer-specific color themes
  - Three size tiers based on marker count
  - Spiderfy effect at maximum zoom
  - Performance-optimized chunked loading

- **Analytics Panel**: Collapsible statistics sidebar
  - Real-time counts for all data layers
  - Top 5 breakdowns (countries, ship types, etc.)
  - Magnitude distribution for earthquakes
  - Severity distribution for weather alerts
  - CSS-based mini bar charts
  - Smooth slide animations

- **Layer Controls**: Updated with 3 new toggles
  - Ships (green indicator)
  - Weather (orange indicator)
  - News (purple indicator)

#### Performance
- **Metrics Tracking**: Service health monitoring
  - Per-service success/failure counters
  - Fetch timestamp tracking
  - Success rate calculation

### Changed

- Updated `server/index.js` with modular interval management
- Updated `server/services/cache.js` with statistics tracking
- Updated `server/websocket.js` with close() method for graceful shutdown
- Updated `client/src/hooks/useLayerData.js` with ships, weather, news state
- Updated `client/src/utils/api.js` with new fetch functions
- Updated `client/src/App.jsx` with new layers and analytics panel
- Updated `client/src/components/LayerControls.jsx` with new toggles
- Updated `client/src/App.css` with clustering and panel styles
- Updated all layer components with MarkerClusterGroup

### Dependencies Added

#### Server
- `helmet` (^8.1.0) - Security headers
- `express-rate-limit` (^8.3.1) - Rate limiting
- `zod` (^4.3.6) - Schema validation
- `dotenv` (^17.3.1) - Environment configuration

#### Client
- `leaflet.markercluster` (^1.5.3) - Marker clustering
- `react-leaflet-cluster` (^4.0.0) - React wrapper for clustering

---

## [1.0.0] - Initial Release

### Features
- Real-time flight tracking (OpenSky Network)
- Earthquake monitoring (USGS)
- Satellite tracking (CelesTrak + satellite.js)
- WebSocket-powered live updates
- Interactive Leaflet map with dark theme
- Layer toggle controls
- Connection status indicator
- In-memory caching with TTL
- Request deduplication
- Exponential backoff for API rate limits

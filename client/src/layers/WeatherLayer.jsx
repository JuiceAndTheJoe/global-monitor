import { memo, useMemo } from 'react';
import { LayerGroup, Marker, Popup, Polygon } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import InfoPopup from '../components/InfoPopup';

// Icon cache to prevent recreation on every render
const iconCache = new Map();

// Severity colors matching the specification
const severityColors = {
  emergency: '#ef4444',    // red
  warning: '#f97316',      // orange
  watch: '#eab308',        // yellow
  advisory: '#3b82f6',     // blue
  unknown: '#6b7280'       // gray
};

// Event type icons (using Unicode symbols for maximum compatibility)
const eventIcons = {
  // Severe weather
  'Tornado': '🌪️',
  'Hurricane': '🌀',
  'Tropical Storm': '🌀',
  'Typhoon': '🌀',
  'Cyclone': '🌀',
  'Severe Thunderstorm': '⛈️',
  'Thunderstorm': '⛈️',
  'Flash Flood': '🌊',
  'Flood': '🌊',
  'Blizzard': '🌨️',
  'Winter Storm': '❄️',
  'Ice Storm': '🧊',
  'Heavy Snow': '❄️',
  'High Wind': '💨',
  'Wind': '💨',
  'Extreme Cold': '🥶',
  'Extreme Heat': '🌡️',
  'Heat': '🌡️',
  'Dust Storm': '🌫️',
  'Fog': '🌫️',
  // Default
  'default': '⚠️'
};

// Get icon for event type
function getEventIcon(eventType) {
  if (!eventType) return eventIcons.default;

  // Check for exact match first
  if (eventIcons[eventType]) return eventIcons[eventType];

  // Check for partial matches
  const lowerType = eventType.toLowerCase();
  for (const [key, icon] of Object.entries(eventIcons)) {
    if (lowerType.includes(key.toLowerCase())) {
      return icon;
    }
  }

  return eventIcons.default;
}

// Create weather event icon with caching
function getWeatherIcon(eventType, severity) {
  const cacheKey = `${eventType}-${severity}`;

  if (!iconCache.has(cacheKey)) {
    const icon = getEventIcon(eventType);
    const color = severityColors[severity] || severityColors.unknown;

    iconCache.set(cacheKey, L.divIcon({
      className: 'weather-marker',
      html: `
        <div style="
          font-size: 24px;
          text-shadow: 0 0 4px ${color}, 0 0 8px ${color};
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          ${icon}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }));
  }

  return iconCache.get(cacheKey);
}

// Format timestamp to readable string
function formatTime(timestamp) {
  if (!timestamp) return 'Unknown';
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return 'Unknown';
  }
}

// Memoized individual weather event marker
const WeatherMarker = memo(function WeatherMarker({ event }) {
  const icon = useMemo(
    () => getWeatherIcon(event.eventType, event.severity),
    [event.eventType, event.severity]
  );

  const position = useMemo(
    () => [event.coordinates[1], event.coordinates[0]],
    [event.coordinates]
  );

  // Build info rows for popup
  const infoRows = [
    { label: 'Severity', value: (event.severity || 'unknown').toUpperCase() },
    { label: 'Area', value: event.area || 'Unknown' }
  ];

  if (event.urgency) {
    infoRows.push({ label: 'Urgency', value: event.urgency });
  }

  if (event.certainty) {
    infoRows.push({ label: 'Certainty', value: event.certainty });
  }

  if (event.onset) {
    infoRows.push({ label: 'Onset', value: formatTime(event.onset) });
  }

  if (event.expires) {
    infoRows.push({ label: 'Expires', value: formatTime(event.expires) });
  }

  if (event.windSpeed) {
    infoRows.push({ label: 'Wind Speed', value: `${event.windSpeed} m/s` });
  }

  if (event.pressure) {
    infoRows.push({ label: 'Pressure', value: `${event.pressure} hPa` });
  }

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <InfoPopup
          title={event.headline || event.eventType}
          rows={infoRows}
        />
        {event.description && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            {event.description}
          </div>
        )}
        {event.instruction && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>Instructions:</strong><br />
            {event.instruction}
          </div>
        )}
      </Popup>
    </Marker>
  );
});

// Memoized polygon for affected area
const WeatherPolygon = memo(function WeatherPolygon({ event }) {
  if (!event.polygon) return null;

  const color = severityColors[event.severity] || severityColors.unknown;

  // Convert polygon coordinates from [lon, lat] to [lat, lon] for Leaflet
  const positions = useMemo(() => {
    if (!event.polygon || !event.polygon[0]) return null;

    return event.polygon[0].map(coord => [coord[1], coord[0]]);
  }, [event.polygon]);

  if (!positions) return null;

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color,
        weight: 2,
        opacity: 0.6,
        fillColor: color,
        fillOpacity: 0.15
      }}
    >
      <Popup>
        <InfoPopup
          title={event.headline || event.eventType}
          rows={[
            { label: 'Severity', value: (event.severity || 'unknown').toUpperCase() },
            { label: 'Area', value: event.area || 'Unknown' }
          ]}
        />
      </Popup>
    </Polygon>
  );
});

const WeatherLayer = memo(function WeatherLayer({ data, visible }) {
  if (!visible || !data.length) return null;

  // Custom cluster icon creator for weather (orange theme)
  const createClusterCustomIcon = function (cluster) {
    const count = cluster.getChildCount();
    let size = 'small';
    if (count > 30) size = 'large';
    else if (count > 15) size = 'medium';

    return L.divIcon({
      html: `<div><span>${count}</span></div>`,
      className: `marker-cluster marker-cluster-${size} marker-cluster-weather`,
      iconSize: L.point(40, 40, true)
    });
  };

  return (
    <LayerGroup>
      {/* Render all polygons first (background layer) */}
      {data.map((event) => (
        <WeatherPolygon key={`polygon-${event.id}`} event={event} />
      ))}

      {/* Render markers in a cluster group on top */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
        maxClusterRadius={70}
        disableClusteringAtZoom={8}
      >
        {data.map((event) => (
          <WeatherMarker key={`marker-${event.id}`} event={event} />
        ))}
      </MarkerClusterGroup>
    </LayerGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default WeatherLayer;

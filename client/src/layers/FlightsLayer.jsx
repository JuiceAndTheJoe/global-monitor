import { memo, useMemo } from 'react';
import { LayerGroup, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import InfoPopup from '../components/InfoPopup';

// Icon cache to prevent recreation on every render
const iconCache = new Map();

// Create rotated plane icon with caching
function getPlaneIcon(heading, altitude) {
  // Round values to reduce cache entries (10° heading, 1000m altitude buckets)
  const headingKey = Math.round((heading || 0) / 10) * 10;
  const altitudeKey = Math.round((altitude || 0) / 1000);
  const cacheKey = `${headingKey}-${altitudeKey}`;

  if (!iconCache.has(cacheKey)) {
    // Color based on altitude (blue=low, white=high)
    const maxAlt = 12000;
    const ratio = Math.min((altitude || 0) / maxAlt, 1);
    const r = Math.round(52 + ratio * 203);
    const g = Math.round(152 + ratio * 103);
    const b = Math.round(219 + ratio * 36);
    const color = `rgb(${r}, ${g}, ${b})`;

    iconCache.set(cacheKey, L.divIcon({
      className: 'flight-marker',
      html: `<div style="transform: rotate(${headingKey}deg); color: ${color}; font-size: 16px;">✈</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    }));
  }

  return iconCache.get(cacheKey);
}

// Memoized individual flight marker
const FlightMarker = memo(function FlightMarker({ flight }) {
  const icon = useMemo(
    () => getPlaneIcon(flight.properties.heading, flight.properties.altitude),
    [flight.properties.heading, flight.properties.altitude]
  );

  return (
    <Marker
      position={[flight.coordinates[1], flight.coordinates[0]]}
      icon={icon}
    >
      <Popup>
        <InfoPopup
          title={flight.properties.callsign || 'Unknown'}
          rows={[
            { label: 'Altitude', value: `${Math.round(flight.properties.altitude || 0)} m` },
            { label: 'Speed', value: `${Math.round(flight.properties.velocity || 0)} m/s` },
            { label: 'Heading', value: `${Math.round(flight.properties.heading || 0)}°` },
            { label: 'Country', value: flight.properties.origin_country || 'Unknown' }
          ]}
        />
      </Popup>
    </Marker>
  );
});

const FlightsLayer = memo(function FlightsLayer({ data, visible }) {
  if (!visible || !data.length) return null;

  return (
    <LayerGroup>
      {data.map((flight) => (
        <FlightMarker key={flight.id} flight={flight} />
      ))}
    </LayerGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default FlightsLayer;

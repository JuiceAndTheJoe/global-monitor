import { memo, useMemo } from 'react';
import { LayerGroup, CircleMarker, Popup } from 'react-leaflet';
import InfoPopup from '../components/InfoPopup';

// Calculate radius based on magnitude (exponential scale)
function getRadius(magnitude) {
  return Math.pow(2, magnitude) * 0.5;
}

// Color based on recency (red=recent, orange=older)
function getColor(time) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  if (time > hourAgo) return '#e74c3c'; // Red - within hour
  if (time > dayAgo) return '#e67e22';  // Orange - within day
  return '#f39c12';                      // Yellow - older
}

// Check if quake is recent (< 1 hour)
function isRecent(time) {
  return time > Date.now() - 60 * 60 * 1000;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Memoized individual earthquake marker
const EarthquakeMarker = memo(function EarthquakeMarker({ quake }) {
  const color = useMemo(() => getColor(quake.properties.time), [quake.properties.time]);
  const radius = useMemo(() => getRadius(quake.properties.magnitude), [quake.properties.magnitude]);
  const recent = isRecent(quake.properties.time);

  return (
    <CircleMarker
      center={[quake.coordinates[1], quake.coordinates[0]]}
      radius={radius}
      pathOptions={{
        fillColor: color,
        fillOpacity: recent ? 0.9 : 0.6,
        color: recent ? '#fff' : color,
        weight: recent ? 2 : 1
      }}
    >
      <Popup>
        <InfoPopup
          title={`M${quake.properties.magnitude.toFixed(1)} Earthquake`}
          rows={[
            { label: 'Location', value: quake.properties.place || 'Unknown' },
            { label: 'Depth', value: `${quake.properties.depth.toFixed(1)} km` },
            { label: 'Time', value: formatTime(quake.properties.time) }
          ]}
        />
      </Popup>
    </CircleMarker>
  );
});

const EarthquakesLayer = memo(function EarthquakesLayer({ data, visible }) {
  if (!visible || !data.length) return null;

  return (
    <LayerGroup>
      {data.map((quake) => (
        <EarthquakeMarker key={quake.id} quake={quake} />
      ))}
    </LayerGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default EarthquakesLayer;

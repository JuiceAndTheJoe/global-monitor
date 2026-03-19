import { memo, useMemo } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
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

  // Custom cluster icon creator for earthquakes (red theme)
  const createClusterCustomIcon = function (cluster) {
    const count = cluster.getChildCount();
    let size = 'small';
    if (count > 50) size = 'large';
    else if (count > 20) size = 'medium';

    return L.divIcon({
      html: `<div><span>${count}</span></div>`,
      className: `marker-cluster marker-cluster-${size} marker-cluster-earthquakes`,
      iconSize: L.point(40, 40, true)
    });
  };

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={createClusterCustomIcon}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
      maxClusterRadius={80}
      disableClusteringAtZoom={8}
    >
      {data.map((quake) => (
        <EarthquakeMarker key={quake.id} quake={quake} />
      ))}
    </MarkerClusterGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default EarthquakesLayer;

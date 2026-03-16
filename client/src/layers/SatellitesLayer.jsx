import { memo, useMemo } from 'react';
import { LayerGroup, CircleMarker, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import InfoPopup from '../components/InfoPopup';

// Colors by category
const categoryColors = {
  iss: '#f1c40f',
  starlink: '#3498db',
  gps: '#2ecc71',
  weather: '#00bcd4',
  default: '#9b59b6'
};

// Special ISS icon (created once)
const issIcon = L.divIcon({
  className: 'satellite-marker satellite-iss',
  html: '<div style="background: #f1c40f; width: 12px; height: 12px; border-radius: 50%;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Memoized satellite marker
const SatelliteMarker = memo(function SatelliteMarker({ sat }) {
  const isISS = sat.properties.category === 'iss' ||
                sat.properties.name?.toLowerCase().includes('iss');
  const color = categoryColors[sat.properties.category] || categoryColors.default;

  const popupContent = useMemo(() => (
    <InfoPopup
      title={isISS ? 'International Space Station' : (sat.properties.name || 'Unknown Satellite')}
      rows={[
        { label: 'Altitude', value: `${Math.round(sat.properties.altitude || 0)} km` },
        { label: 'Velocity', value: `${(sat.properties.velocity || 0).toFixed(2)} km/s` },
        { label: 'Category', value: isISS ? 'ISS' : (sat.properties.category || 'Unknown') }
      ]}
    />
  ), [sat.properties.name, sat.properties.altitude, sat.properties.velocity, sat.properties.category, isISS]);

  if (isISS) {
    return (
      <Marker
        position={[sat.coordinates[1], sat.coordinates[0]]}
        icon={issIcon}
      >
        <Popup>{popupContent}</Popup>
      </Marker>
    );
  }

  return (
    <CircleMarker
      center={[sat.coordinates[1], sat.coordinates[0]]}
      radius={4}
      pathOptions={{
        fillColor: color,
        fillOpacity: 0.8,
        color: color,
        weight: 1
      }}
    >
      <Popup>{popupContent}</Popup>
    </CircleMarker>
  );
});

const SatellitesLayer = memo(function SatellitesLayer({ data, visible }) {
  if (!visible || !data.length) return null;

  return (
    <LayerGroup>
      {data.map((sat) => (
        <SatelliteMarker key={sat.id} sat={sat} />
      ))}
    </LayerGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default SatellitesLayer;

import { memo, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import InfoPopup from '../components/InfoPopup';

// Icon cache to prevent recreation on every render
const iconCache = new Map();

// Ship type configurations
const SHIP_STYLES = {
  cargo: { icon: '🚢', color: '#22c55e' }, // green
  tanker: { icon: '🛢️', color: '#f97316' }, // orange
  passenger: { icon: '🛳️', color: '#3b82f6' }, // blue
  container: { icon: '📦', color: '#10b981' }, // emerald
  military: { icon: '⚓', color: '#ef4444' }, // red
};

// Create rotated ship icon with caching
function getShipIcon(heading, type) {
  // Round heading to reduce cache entries (15° buckets)
  const headingKey = Math.round((heading || 0) / 15) * 15;
  const cacheKey = `${type}-${headingKey}`;

  if (!iconCache.has(cacheKey)) {
    const style = SHIP_STYLES[type] || SHIP_STYLES.cargo;

    iconCache.set(cacheKey, L.divIcon({
      className: 'ship-marker',
      html: `<div style="transform: rotate(${headingKey}deg); font-size: 20px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));">
        <span style="display: inline-block; position: relative;">
          ${style.icon}
          <span style="position: absolute; top: -2px; left: -2px; width: 24px; height: 24px; border: 2px solid ${style.color}; border-radius: 50%; opacity: 0.6;"></span>
        </span>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    }));
  }

  return iconCache.get(cacheKey);
}

// Memoized individual ship marker
const ShipMarker = memo(function ShipMarker({ ship }) {
  const icon = useMemo(
    () => getShipIcon(ship.properties.heading, ship.properties.type),
    [ship.properties.heading, ship.properties.type]
  );

  return (
    <Marker
      position={[ship.coordinates[1], ship.coordinates[0]]}
      icon={icon}
    >
      <Popup>
        <InfoPopup
          title={ship.properties.name}
          rows={[
            { label: 'Type', value: ship.properties.typeName },
            { label: 'Speed', value: `${Math.round(ship.properties.speed * 10) / 10} knots` },
            { label: 'Heading', value: `${Math.round(ship.properties.heading)}°` },
            { label: 'Destination', value: ship.properties.destination },
            { label: 'Flag', value: ship.properties.flag },
            { label: 'Length', value: `${ship.properties.length} m` }
          ]}
        />
      </Popup>
    </Marker>
  );
});

const ShipsLayer = memo(function ShipsLayer({ data, visible }) {
  if (!visible || !data.length) return null;

  // Custom cluster icon creator for ships (green theme)
  const createClusterCustomIcon = function (cluster) {
    const count = cluster.getChildCount();
    let size = 'small';
    if (count > 100) size = 'large';
    else if (count > 50) size = 'medium';

    return L.divIcon({
      html: `<div><span>${count}</span></div>`,
      className: `marker-cluster marker-cluster-${size} marker-cluster-ships`,
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
      maxClusterRadius={60}
      disableClusteringAtZoom={10}
    >
      {data.map((ship) => (
        <ShipMarker key={ship.id} ship={ship} />
      ))}
    </MarkerClusterGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default ShipsLayer;

import { MapContainer, TileLayer } from 'react-leaflet';

function Map({ children }) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="map-container"
      worldCopyJump={true}
      minZoom={2}
      maxZoom={18}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {children}
    </MapContainer>
  );
}

export default Map;

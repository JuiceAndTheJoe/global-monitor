import { useState, useCallback } from 'react';
import Map from './components/Map';
import LayerControls from './components/LayerControls';
import FlightsLayer from './layers/FlightsLayer';
import EarthquakesLayer from './layers/EarthquakesLayer';
import SatellitesLayer from './layers/SatellitesLayer';
import useLayerData from './hooks/useLayerData';

function App() {
  const [layers, setLayers] = useState({
    flights: true,
    earthquakes: true,
    satellites: true
  });

  const { flights, earthquakes, satellites, loading, connected } = useLayerData();

  // Memoized toggle function to prevent unnecessary re-renders
  const toggleLayer = useCallback((layer) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return (
    <div className="app">
      <Map>
        <FlightsLayer data={flights} visible={layers.flights} />
        <EarthquakesLayer data={earthquakes} visible={layers.earthquakes} />
        <SatellitesLayer data={satellites} visible={layers.satellites} />
      </Map>

      <LayerControls layers={layers} onToggle={toggleLayer} />

      {loading && (
        <div className="loading-indicator">Loading data...</div>
      )}

      <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot"></span>
        {connected ? 'Live' : 'Reconnecting...'}
      </div>
    </div>
  );
}

export default App;

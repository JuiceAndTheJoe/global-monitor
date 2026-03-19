import { useState, useCallback } from 'react';
import Map from './components/Map';
import LayerControls from './components/LayerControls';
import AnalyticsPanel from './components/AnalyticsPanel';
import FlightsLayer from './layers/FlightsLayer';
import EarthquakesLayer from './layers/EarthquakesLayer';
import SatellitesLayer from './layers/SatellitesLayer';
import ShipsLayer from './layers/ShipsLayer';
import WeatherLayer from './layers/WeatherLayer';
import NewsLayer from './layers/NewsLayer';
import useLayerData from './hooks/useLayerData';

function App() {
  const [layers, setLayers] = useState({
    flights: true,
    earthquakes: true,
    satellites: true,
    ships: true,
    weather: true,
    news: true
  });

  const { flights, earthquakes, satellites, ships, weather, news, loading, connected } = useLayerData();

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
        <ShipsLayer data={ships} visible={layers.ships} />
        <WeatherLayer data={weather} visible={layers.weather} />
        <NewsLayer data={news} visible={layers.news} />
      </Map>

      <AnalyticsPanel
        flights={flights}
        earthquakes={earthquakes}
        satellites={satellites}
        ships={ships}
        weather={weather}
        news={news}
      />

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

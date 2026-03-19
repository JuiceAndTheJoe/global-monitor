import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFlights, fetchEarthquakes, fetchSatellites, fetchShips, fetchWeather, fetchNews } from '../utils/api';
import useWebSocket from './useWebSocket';

function useLayerData() {
  const [flights, setFlights] = useState([]);
  const [earthquakes, setEarthquakes] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [ships, setShips] = useState([]);
  const [weather, setWeather] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // Handle WebSocket messages - update specific layer
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.layer) {
      case 'flights':
        setFlights(message.data);
        break;
      case 'earthquakes':
        setEarthquakes(message.data);
        break;
      case 'satellites':
        setSatellites(message.data);
        break;
      case 'ships':
        setShips(message.data);
        break;
      case 'weather':
        setWeather(message.data);
        break;
      case 'news':
        setNews(message.data);
        break;
    }
  }, []);

  const { connected, reconnect } = useWebSocket(handleWebSocketMessage);

  // Initial fetch only - no polling when WebSocket is connected
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [flightsData, earthquakesData, satellitesData, shipsData, weatherData, newsData] = await Promise.all([
        fetchFlights(),
        fetchEarthquakes(),
        fetchSatellites(),
        fetchShips(),
        fetchWeather(),
        fetchNews()
      ]);

      setFlights(flightsData);
      setEarthquakes(earthquakesData);
      setSatellites(satellitesData);
      setShips(shipsData);
      setWeather(weatherData);
      setNews(newsData);
      initialLoadDone.current = true;
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only
  useEffect(() => {
    if (!initialLoadDone.current) {
      fetchAllData();
    }
  }, [fetchAllData]);

  // Refresh data when WebSocket reconnects (after disconnection)
  useEffect(() => {
    if (connected && initialLoadDone.current) {
      // Small delay to let WebSocket stabilize
      const timeout = setTimeout(fetchAllData, 500);
      return () => clearTimeout(timeout);
    }
  }, [connected, fetchAllData]);

  return {
    flights,
    earthquakes,
    satellites,
    ships,
    weather,
    news,
    loading,
    connected,
    reconnect,
    refresh: fetchAllData
  };
}

export default useLayerData;

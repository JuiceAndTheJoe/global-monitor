import * as cache from './cache.js';
import { recordSuccess, recordFailure } from '../utils/metrics.js';

const CACHE_TTL = 300; // 5 minutes
const NWS_BASE_URL = 'https://api.weather.gov';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetch severe weather alerts from NWS API (US only)
 * Returns active weather alerts with polygons where available
 */
async function fetchNWSAlerts() {
  const cacheKey = 'nws-alerts';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${NWS_BASE_URL}/alerts/active`, {
      headers: {
        'User-Agent': 'GlobalMonitorDashboard/1.0',
        'Accept': 'application/geo+json'
      }
    });

    if (!response.ok) {
      throw new Error(`NWS API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform NWS alerts to our format
    const alerts = data.features
      .filter(feature => feature.geometry) // Only include alerts with geometry
      .map(feature => {
        const props = feature.properties;

        // Determine severity level
        let severity = 'unknown';
        if (props.severity === 'Extreme') severity = 'emergency';
        else if (props.severity === 'Severe') severity = 'warning';
        else if (props.severity === 'Moderate') severity = 'watch';
        else if (props.severity === 'Minor') severity = 'advisory';

        // Extract coordinates from geometry
        let coordinates = null;
        let polygon = null;

        if (feature.geometry.type === 'Polygon') {
          polygon = feature.geometry.coordinates;
          // Use first point as center
          coordinates = polygon[0][0];
        } else if (feature.geometry.type === 'MultiPolygon') {
          polygon = feature.geometry.coordinates[0];
          coordinates = polygon[0][0];
        }

        return {
          id: props.id,
          type: 'nws-alert',
          eventType: props.event || 'Unknown',
          severity,
          headline: props.headline || props.description || 'Weather Alert',
          description: props.description || '',
          area: props.areaDesc || 'Unknown Area',
          coordinates: coordinates ? [coordinates[0], coordinates[1]] : null,
          polygon,
          onset: props.onset,
          expires: props.expires,
          instruction: props.instruction,
          urgency: props.urgency,
          certainty: props.certainty
        };
      })
      .filter(alert => alert.coordinates); // Only include alerts with valid coordinates

    cache.set(cacheKey, alerts, CACHE_TTL);
    return alerts;
  } catch (error) {
    console.error('Error fetching NWS alerts:', error.message);
    return [];
  }
}

/**
 * Fetch global storm data using OpenWeatherMap (free tier)
 * Note: Requires API key in environment variable OPENWEATHER_API_KEY
 * Alternative: Can be replaced with NOAA/NHC for hurricanes
 */
async function fetchGlobalStorms() {
  const cacheKey = 'global-storms';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.OPENWEATHER_API_KEY;

  // If no API key, return empty array (graceful degradation)
  if (!apiKey) {
    console.warn('OPENWEATHER_API_KEY not set - global storm data unavailable');
    return [];
  }

  try {
    // Check for severe weather in multiple regions globally
    // Using coordinates for major storm-prone areas
    const regions = [
      { name: 'Atlantic', lat: 20, lon: -60 },
      { name: 'Pacific', lat: 15, lon: -140 },
      { name: 'Indian Ocean', lat: -10, lon: 70 },
      { name: 'Western Pacific', lat: 15, lon: 140 }
    ];

    const stormData = [];

    for (const region of regions) {
      try {
        const response = await fetch(
          `${OPENWEATHER_BASE_URL}/weather?lat=${region.lat}&lon=${region.lon}&appid=${apiKey}`
        );

        if (!response.ok) continue;

        const data = await response.json();

        // Check for severe weather conditions
        const weather = data.weather?.[0];
        const isSevere = weather && (
          weather.id >= 200 && weather.id < 300 || // Thunderstorm
          weather.id >= 900 && weather.id < 903 || // Extreme conditions
          weather.id === 781 // Tornado
        );

        if (isSevere) {
          stormData.push({
            id: `owm-${region.name}-${Date.now()}`,
            type: 'storm',
            eventType: weather.main,
            severity: 'warning',
            headline: weather.description,
            description: `${weather.description} in ${region.name} region`,
            area: region.name,
            coordinates: [data.coord.lon, data.coord.lat],
            polygon: null,
            windSpeed: data.wind?.speed,
            pressure: data.main?.pressure,
            temperature: data.main?.temp
          });
        }
      } catch (err) {
        console.error(`Error fetching storm data for ${region.name}:`, err.message);
      }
    }

    cache.set(cacheKey, stormData, CACHE_TTL);
    return stormData;
  } catch (error) {
    console.error('Error fetching global storms:', error.message);
    return [];
  }
}

/**
 * Get all weather data (NWS alerts + global storms)
 */
export async function getWeather() {
  try {
    const [nwsAlerts, globalStorms] = await Promise.all([
      fetchNWSAlerts(),
      fetchGlobalStorms()
    ]);

    // Combine and return all weather data
    const weatherData = [...nwsAlerts, ...globalStorms];

    // Record success metric
    recordSuccess('weather');

    return weatherData;
  } catch (error) {
    console.error('Error getting weather data:', error.message);

    // Record failure metric
    recordFailure('weather');

    return [];
  }
}

export default { getWeather };

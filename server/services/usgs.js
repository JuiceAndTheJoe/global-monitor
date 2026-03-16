// USGS Earthquake API service
import * as cache from './cache.js';

const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const CACHE_KEY = 'usgs_earthquakes';
const CACHE_TTL = 120; // 2 minutes (USGS updates ~every 5-15 min)

/**
 * Fetch earthquake data from USGS API
 * @returns {Promise<Array>} Array of standardized earthquake objects
 */
export async function getEarthquakes() {
  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(USGS_API_URL);

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform GeoJSON FeatureCollection to standardized format
    // Remove URL to reduce payload size
    const earthquakes = data.features.map(feature => ({
      id: feature.id,
      coordinates: feature.geometry.coordinates.slice(0, 2),
      properties: {
        magnitude: feature.properties.mag,
        place: feature.properties.place,
        time: feature.properties.time,
        depth: feature.geometry.coordinates[2]
      }
    }));

    // Cache the result
    cache.set(CACHE_KEY, earthquakes, CACHE_TTL);
    console.log(`Fetched ${earthquakes.length} earthquakes from USGS`);

    return earthquakes;
  } catch (error) {
    console.error('Error fetching earthquake data:', error.message);
    // Return stale cache if available
    const stale = cache.get(CACHE_KEY);
    if (stale) return stale;
    throw error;
  }
}

/**
 * Filter earthquakes by magnitude range
 */
export function filterByMagnitude(earthquakes, minMag, maxMag) {
  return earthquakes.filter(eq => {
    const mag = eq.properties.magnitude;
    if (mag === null || mag === undefined) return false;

    const meetsMin = minMag === undefined || mag >= minMag;
    const meetsMax = maxMag === undefined || mag <= maxMag;

    return meetsMin && meetsMax;
  });
}

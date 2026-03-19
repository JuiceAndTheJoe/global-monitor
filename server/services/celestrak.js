import * as satellite from 'satellite.js';
import * as cache from './cache.js';
import { recordSuccess, recordFailure } from '../utils/metrics.js';

const TLE_CACHE_TTL = 6 * 60 * 60; // 6 hours for TLE data
const POSITION_CACHE_TTL = 60; // 60 seconds for computed positions

// TLE data sources - curated subset of ~100 satellites
const TLE_SOURCES = {
  iss: {
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
    limit: 10,
  },
  starlink: {
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
    limit: 30,
  },
  gps: {
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
    limit: null,
  },
  weather: {
    url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
    limit: null,
  },
};

/**
 * Parse TLE text data into array of TLE objects
 */
function parseTLE(tleText) {
  const lines = tleText.trim().split('\n');
  const sats = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;

    const name = lines[i].trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (line1 && line2 && line1.charAt(0) === '1' && line2.charAt(0) === '2') {
      sats.push({ name, line1, line2 });
    }
  }

  return sats;
}

/**
 * Compute current position and velocity of a satellite from TLE data
 */
function computePosition(tle) {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const now = new Date();
    const positionAndVelocity = satellite.propagate(satrec, now);

    if (!positionAndVelocity.position || positionAndVelocity.position === false) {
      return null;
    }

    const gmst = satellite.gstime(now);
    const position = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

    const velocity = positionAndVelocity.velocity
      ? Math.sqrt(
          positionAndVelocity.velocity.x ** 2 +
          positionAndVelocity.velocity.y ** 2 +
          positionAndVelocity.velocity.z ** 2
        )
      : 0;

    return {
      lat: satellite.degreesLat(position.latitude),
      lon: satellite.degreesLong(position.longitude),
      altitude: position.height,
      velocity,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch TLE data from CelesTrak for a specific category
 */
async function fetchTLEData(category) {
  const source = TLE_SOURCES[category];
  if (!source) {
    throw new Error(`Unknown satellite category: ${category}`);
  }

  const cacheKey = `tle_${category}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(source.url);

    if (!response.ok) {
      throw new Error(`CelesTrak API error: ${response.status} ${response.statusText}`);
    }

    const tleText = await response.text();
    let tles = parseTLE(tleText);

    if (source.limit) {
      tles = tles.slice(0, source.limit);
    }

    cache.set(cacheKey, tles, TLE_CACHE_TTL);
    console.log(`Fetched ${tles.length} TLEs for category: ${category}`);
    return tles;
  } catch (error) {
    console.error(`Error fetching TLE data for ${category}:`, error.message);

    // Record failure metric (only for complete failures, not partial)
    recordFailure('satellites');

    // Return cached data if available
    return cache.get(cacheKey) || [];
  }
}

/**
 * Get all satellites with current positions, optionally filtered by category
 * Caches computed positions for 60 seconds to reduce CPU usage
 */
export async function getSatellites(categoryFilter = null) {
  // Check position cache first
  const positionCacheKey = `satellites_${categoryFilter || 'all'}`;
  const cachedPositions = cache.get(positionCacheKey);
  if (cachedPositions) {
    return cachedPositions;
  }

  const categories = categoryFilter
    ? [categoryFilter]
    : Object.keys(TLE_SOURCES);

  const allSatellites = [];

  // Fetch TLE data for each category in parallel
  const tlePromises = categories.map(category =>
    fetchTLEData(category).then(tles => ({ category, tles }))
  );

  const results = await Promise.all(tlePromises);

  // Compute current positions
  for (const { category, tles } of results) {
    for (let index = 0; index < tles.length; index++) {
      const tle = tles[index];
      const position = computePosition(tle);

      if (position) {
        allSatellites.push({
          id: `${category}-${index}`,
          coordinates: [position.lon, position.lat],
          properties: {
            name: tle.name,
            altitude: position.altitude,
            velocity: position.velocity,
            category,
          },
        });
      }
    }
  }

  // Cache computed positions
  cache.set(positionCacheKey, allSatellites, POSITION_CACHE_TTL);
  console.log(`Computed positions for ${allSatellites.length} satellites`);

  // Record success metric
  recordSuccess('satellites');

  return allSatellites;
}

export default { getSatellites };

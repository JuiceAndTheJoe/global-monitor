import * as cache from './cache.js';
import { recordSuccess, recordFailure } from '../utils/metrics.js';

const OPENSKY_API = 'https://opensky-network.org/api/states/all';
const CACHE_KEY = 'opensky_flights';
const CACHE_TTL = 15; // 15 seconds (buffer above broadcast interval)

// Rate limit protection
let rateLimitedUntil = 0;
let consecutiveErrors = 0;
const MAX_BACKOFF = 300000; // 5 minutes max backoff

// Request deduplication
let inflightRequest = null;

/**
 * Fetch flight data from OpenSky Network API
 * @param {Object} bbox - Optional bounding box { lamin, lomin, lamax, lomax }
 * @returns {Promise<Array>} Array of flight objects
 */
export async function getFlights(bbox = {}) {
  // Normalize bbox to increase cache hits (round to 1 degree)
  const normalizedBbox = normalizeBbox(bbox);
  const cacheKey = normalizedBbox ? `${CACHE_KEY}_${JSON.stringify(normalizedBbox)}` : CACHE_KEY;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if we're rate limited
  if (Date.now() < rateLimitedUntil) {
    console.warn(`OpenSky rate limited until ${new Date(rateLimitedUntil).toISOString()}`);
    // Return stale cache if available
    const stale = cache.get(cacheKey);
    return stale || [];
  }

  // Deduplicate concurrent requests
  if (inflightRequest) {
    try {
      await inflightRequest;
      return cache.get(cacheKey) || [];
    } catch {
      return [];
    }
  }

  inflightRequest = fetchFlights(normalizedBbox || bbox, cacheKey);

  try {
    return await inflightRequest;
  } finally {
    inflightRequest = null;
  }
}

async function fetchFlights(bbox, cacheKey) {
  try {
    // Build URL with optional bbox parameters
    const url = new URL(OPENSKY_API);
    if (bbox.lamin !== undefined) url.searchParams.set('lamin', bbox.lamin);
    if (bbox.lomin !== undefined) url.searchParams.set('lomin', bbox.lomin);
    if (bbox.lamax !== undefined) url.searchParams.set('lamax', bbox.lamax);
    if (bbox.lomax !== undefined) url.searchParams.set('lomax', bbox.lomax);

    const response = await fetch(url.toString());

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '60');
      rateLimitedUntil = Date.now() + (retryAfter * 1000);
      console.error(`OpenSky rate limited. Retry after ${retryAfter}s`);
      return cache.get(cacheKey) || [];
    }

    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    // Transform OpenSky format to standardized format
    const flights = transformFlights(json.states || []);

    // Cache the result
    cache.set(cacheKey, flights, CACHE_TTL);

    // Reset error counter on success
    consecutiveErrors = 0;

    // Record success metric
    recordSuccess('flights');

    return flights;
  } catch (error) {
    console.error('Error fetching flights from OpenSky:', error.message);

    // Record failure metric
    recordFailure('flights');

    // Exponential backoff on errors
    consecutiveErrors++;
    const backoff = Math.min(1000 * Math.pow(2, consecutiveErrors), MAX_BACKOFF);
    rateLimitedUntil = Date.now() + backoff;
    console.warn(`Backing off for ${backoff}ms after ${consecutiveErrors} consecutive errors`);

    return cache.get(cacheKey) || [];
  }
}

/**
 * Normalize bbox to 1-degree grid to increase cache hits
 */
function normalizeBbox(bbox) {
  if (!bbox.lamin) return null;
  return {
    lamin: Math.floor(bbox.lamin),
    lomin: Math.floor(bbox.lomin),
    lamax: Math.ceil(bbox.lamax),
    lomax: Math.ceil(bbox.lomax),
  };
}

/**
 * Transform OpenSky API response format to standardized format
 */
function transformFlights(states) {
  const flights = [];
  for (const state of states) {
    const lon = state[5];
    const lat = state[6];
    if (lon !== null && lat !== null) {
      flights.push({
        id: state[0],
        coordinates: [lon, lat],
        properties: {
          callsign: state[1]?.trim() || null,
          origin_country: state[2],
          altitude: state[7] || state[13] || 0,
          velocity: state[9] || 0,
          heading: state[10] || 0,
          on_ground: state[8] || false
        }
      });
    }
  }
  return flights;
}

export default { getFlights };

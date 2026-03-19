import { Router } from 'express';
import { getEarthquakes, filterByMagnitude } from '../services/usgs.js';
import { get, set } from '../services/cache.js';
import { validateMagnitude } from '../utils/validation.js';

const router = Router();
const CACHE_KEY = 'earthquakes';
const CACHE_TTL = 60; // 60 seconds

/**
 * GET /api/earthquakes
 * Query params (optional):
 * - minmag: minimum magnitude (0 to 10)
 * - maxmag: maximum magnitude (0 to 10)
 */
router.get('/', validateMagnitude, async (req, res) => {
  try {
    const { minmag, maxmag } = req.query;

    // Try to get cached data
    let earthquakes = get(CACHE_KEY);

    // If cache miss, fetch fresh data
    if (!earthquakes) {
      earthquakes = await getEarthquakes();
      set(CACHE_KEY, earthquakes, CACHE_TTL);
    }

    // Apply magnitude filters if provided
    let filteredData = earthquakes;
    if (minmag !== undefined || maxmag !== undefined) {
      const min = minmag ? parseFloat(minmag) : undefined;
      const max = maxmag ? parseFloat(maxmag) : undefined;
      filteredData = filterByMagnitude(earthquakes, min, max);
    }

    res.json({
      type: 'earthquakes',
      timestamp: Date.now(),
      data: filteredData
    });
  } catch (error) {
    console.error('Error in earthquakes route:', error.message);
    res.status(500).json({
      type: 'earthquakes',
      timestamp: Date.now(),
      data: [],
      error: 'Failed to fetch earthquake data'
    });
  }
});

export default router;

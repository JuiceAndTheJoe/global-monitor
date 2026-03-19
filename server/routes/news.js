import { Router } from 'express';
import { getNews, filterByType, filterByTone } from '../services/news.js';
import { get, set } from '../services/cache.js';

const router = Router();
const CACHE_KEY = 'news';
const CACHE_TTL = 60; // 60 seconds

/**
 * GET /api/news
 * Query params (optional):
 * - type: event type (conflict, protest, disaster, political)
 * - mintone: minimum tone (-100 to 100)
 * - maxtone: maximum tone (-100 to 100)
 */
router.get('/', async (req, res) => {
  try {
    const { type, mintone, maxtone } = req.query;

    // Try to get cached data
    let events = get(CACHE_KEY);

    // If cache miss, fetch fresh data
    if (!events) {
      events = await getNews();
      set(CACHE_KEY, events, CACHE_TTL);
    }

    // Apply filters if provided
    let filteredData = events;

    if (type) {
      filteredData = filterByType(filteredData, type);
    }

    if (mintone !== undefined || maxtone !== undefined) {
      const min = mintone ? parseFloat(mintone) : undefined;
      const max = maxtone ? parseFloat(maxtone) : undefined;
      filteredData = filterByTone(filteredData, min, max);
    }

    res.json({
      type: 'news',
      timestamp: Date.now(),
      data: filteredData
    });
  } catch (error) {
    console.error('Error in news route:', error.message);
    res.status(500).json({
      type: 'news',
      timestamp: Date.now(),
      data: [],
      error: 'Failed to fetch news data'
    });
  }
});

export default router;

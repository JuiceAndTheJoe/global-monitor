import { Router } from 'express';
import { getWeather } from '../services/weather.js';

const router = Router();

/**
 * GET /api/weather
 * Returns severe weather alerts and storm data
 */
router.get('/', async (req, res) => {
  try {
    const weather = await getWeather();

    res.json({
      type: 'weather',
      timestamp: Date.now(),
      data: weather
    });
  } catch (error) {
    console.error('Error in weather route:', error);
    res.status(500).json({
      type: 'weather',
      timestamp: Date.now(),
      data: [],
      error: 'Failed to fetch weather data'
    });
  }
});

export default router;

import { Router } from 'express';
import { getSatellites } from '../services/celestrak.js';

const router = Router();

/**
 * GET /api/satellites
 * Query params (optional):
 * - category: Filter by satellite category (iss, starlink, gps, weather)
 */
router.get('/', async (req, res) => {
  try {
    const category = req.query.category || null;

    // Validate category if provided
    const validCategories = ['iss', 'starlink', 'gps', 'weather'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        type: 'satellites',
        timestamp: Date.now(),
        data: [],
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const satellites = await getSatellites(category);

    res.json({
      type: 'satellites',
      timestamp: Date.now(),
      data: satellites
    });
  } catch (error) {
    console.error('Error in satellites route:', error);
    res.status(500).json({
      type: 'satellites',
      timestamp: Date.now(),
      data: [],
      error: 'Failed to fetch satellite data'
    });
  }
});

export default router;

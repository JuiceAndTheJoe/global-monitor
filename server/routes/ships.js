import { Router } from 'express';
import { getShips } from '../services/ships.js';

const router = Router();

/**
 * GET /api/ships
 * Returns current ship positions and data
 */
router.get('/', async (req, res) => {
  try {
    const ships = await getShips();

    res.json({
      type: 'ships',
      timestamp: Date.now(),
      data: ships
    });
  } catch (error) {
    console.error('Error in ships route:', error);
    res.status(500).json({
      type: 'ships',
      timestamp: Date.now(),
      data: [],
      error: 'Failed to fetch ship data'
    });
  }
});

export default router;

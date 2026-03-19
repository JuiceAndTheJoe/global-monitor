import { Router } from 'express';
import { getFlights } from '../services/opensky.js';
import { validateBoundingBox } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/flights
 * Query params (optional):
 * - lamin: minimum latitude (-90 to 90)
 * - lomin: minimum longitude (-180 to 180)
 * - lamax: maximum latitude (-90 to 90)
 * - lomax: maximum longitude (-180 to 180)
 */
router.get('/', validateBoundingBox, async (req, res) => {
  try {
    // Extract optional bounding box parameters
    const bbox = {};
    if (req.query.lamin) bbox.lamin = parseFloat(req.query.lamin);
    if (req.query.lomin) bbox.lomin = parseFloat(req.query.lomin);
    if (req.query.lamax) bbox.lamax = parseFloat(req.query.lamax);
    if (req.query.lomax) bbox.lomax = parseFloat(req.query.lomax);

    const flights = await getFlights(bbox);

    res.json({
      type: 'flights',
      timestamp: Date.now(),
      data: flights
    });
  } catch (error) {
    console.error('Error in flights route:', error);
    res.status(500).json({
      type: 'flights',
      timestamp: Date.now(),
      data: [],
      error: 'Failed to fetch flight data'
    });
  }
});

export default router;

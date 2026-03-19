import { z } from 'zod';

/**
 * Zod schemas for API request validation
 */

// Bounding box schema for flight queries
export const boundingBoxSchema = z.object({
  lamin: z.string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= -90 && parseFloat(val) <= 90),
      { message: 'lamin must be a valid latitude between -90 and 90' }
    ),
  lomin: z.string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= -180 && parseFloat(val) <= 180),
      { message: 'lomin must be a valid longitude between -180 and 180' }
    ),
  lamax: z.string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= -90 && parseFloat(val) <= 90),
      { message: 'lamax must be a valid latitude between -90 and 90' }
    ),
  lomax: z.string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= -180 && parseFloat(val) <= 180),
      { message: 'lomax must be a valid longitude between -180 and 180' }
    )
}).refine(
  (data) => {
    // If any bbox params are provided, ensure logical consistency
    if (data.lamin && data.lamax) {
      const min = parseFloat(data.lamin);
      const max = parseFloat(data.lamax);
      return min <= max;
    }
    if (data.lomin && data.lomax) {
      const min = parseFloat(data.lomin);
      const max = parseFloat(data.lomax);
      return min <= max;
    }
    return true;
  },
  { message: 'Minimum values must be less than or equal to maximum values' }
);

// Magnitude schema for earthquake queries
export const magnitudeSchema = z.object({
  minmag: z.string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 10),
      { message: 'minmag must be a number between 0 and 10' }
    ),
  maxmag: z.string()
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 10),
      { message: 'maxmag must be a number between 0 and 10' }
    )
}).refine(
  (data) => {
    // Ensure minmag <= maxmag if both are provided
    if (data.minmag && data.maxmag) {
      const min = parseFloat(data.minmag);
      const max = parseFloat(data.maxmag);
      return min <= max;
    }
    return true;
  },
  { message: 'minmag must be less than or equal to maxmag' }
);

// Satellite category schema
const validCategories = ['iss', 'starlink', 'gps', 'weather'];

export const categorySchema = z.object({
  category: z.string()
    .optional()
    .refine(
      (val) => val === undefined || validCategories.includes(val),
      { message: `category must be one of: ${validCategories.join(', ')}` }
    )
});

/**
 * Middleware factory for validating request query parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      // Validate query parameters
      const result = schema.safeParse(req.query);

      if (!result.success) {
        // Extract first error message for cleaner response
        const errorMessage = result.error.errors[0]?.message || 'Invalid query parameters';

        return res.status(400).json({
          type: req.path.split('/')[1] || 'error',
          timestamp: Date.now(),
          data: [],
          error: errorMessage
        });
      }

      // Validation passed, continue to route handler
      next();
    } catch (error) {
      // Unexpected validation error
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        type: 'error',
        timestamp: Date.now(),
        data: [],
        error: 'Internal validation error'
      });
    }
  };
};

/**
 * Export individual validators for convenience
 */
export const validateBoundingBox = validateQuery(boundingBoxSchema);
export const validateMagnitude = validateQuery(magnitudeSchema);
export const validateCategory = validateQuery(categorySchema);

// Metrics tracking for monitoring service health and performance
// Tracks fetch timestamps, success/failure counts, and cache statistics

const metrics = {
  flights: {
    lastFetchTime: null,
    lastSuccessTime: null,
    successCount: 0,
    failureCount: 0,
    totalRequests: 0
  },
  earthquakes: {
    lastFetchTime: null,
    lastSuccessTime: null,
    successCount: 0,
    failureCount: 0,
    totalRequests: 0
  },
  satellites: {
    lastFetchTime: null,
    lastSuccessTime: null,
    successCount: 0,
    failureCount: 0,
    totalRequests: 0
  },
  ships: {
    lastFetchTime: null,
    lastSuccessTime: null,
    successCount: 0,
    failureCount: 0,
    totalRequests: 0
  },
  weather: {
    lastFetchTime: null,
    lastSuccessTime: null,
    successCount: 0,
    failureCount: 0,
    totalRequests: 0
  }
};

/**
 * Record a successful fetch operation
 * @param {string} dataType - Type of data (flights, earthquakes, satellites, ships, weather)
 */
export function recordSuccess(dataType) {
  if (!metrics[dataType]) {
    console.warn(`Unknown data type for metrics: ${dataType}`);
    return;
  }

  const now = Date.now();
  metrics[dataType].lastFetchTime = now;
  metrics[dataType].lastSuccessTime = now;
  metrics[dataType].successCount++;
  metrics[dataType].totalRequests++;
}

/**
 * Record a failed fetch operation
 * @param {string} dataType - Type of data (flights, earthquakes, satellites, ships, weather)
 */
export function recordFailure(dataType) {
  if (!metrics[dataType]) {
    console.warn(`Unknown data type for metrics: ${dataType}`);
    return;
  }

  metrics[dataType].lastFetchTime = Date.now();
  metrics[dataType].failureCount++;
  metrics[dataType].totalRequests++;
}

/**
 * Get metrics for a specific data type
 * @param {string} dataType - Type of data (flights, earthquakes, satellites, ships, weather)
 * @returns {Object|null} Metrics object or null if not found
 */
export function getMetrics(dataType) {
  return metrics[dataType] || null;
}

/**
 * Get all metrics
 * @returns {Object} All metrics
 */
export function getAllMetrics() {
  return { ...metrics };
}

/**
 * Calculate success rate for a data type
 * @param {string} dataType - Type of data
 * @returns {number} Success rate as a percentage (0-100) or null if no data
 */
export function getSuccessRate(dataType) {
  const metric = metrics[dataType];
  if (!metric || metric.totalRequests === 0) {
    return null;
  }
  return Math.round((metric.successCount / metric.totalRequests) * 100);
}

/**
 * Reset metrics for a specific data type
 * @param {string} dataType - Type of data
 */
export function resetMetrics(dataType) {
  if (metrics[dataType]) {
    metrics[dataType] = {
      lastFetchTime: null,
      lastSuccessTime: null,
      successCount: 0,
      failureCount: 0,
      totalRequests: 0
    };
  }
}

/**
 * Reset all metrics
 */
export function resetAllMetrics() {
  Object.keys(metrics).forEach(key => resetMetrics(key));
}

/**
 * Get a summary of all metrics in a formatted way
 * @returns {Object} Summary of all metrics
 */
export function getMetricsSummary() {
  const summary = {};

  for (const [dataType, metric] of Object.entries(metrics)) {
    summary[dataType] = {
      lastFetchTime: metric.lastFetchTime,
      lastSuccessTime: metric.lastSuccessTime,
      successCount: metric.successCount,
      failureCount: metric.failureCount,
      totalRequests: metric.totalRequests,
      successRate: getSuccessRate(dataType)
    };
  }

  return summary;
}

export default {
  recordSuccess,
  recordFailure,
  getMetrics,
  getAllMetrics,
  getSuccessRate,
  resetMetrics,
  resetAllMetrics,
  getMetricsSummary
};

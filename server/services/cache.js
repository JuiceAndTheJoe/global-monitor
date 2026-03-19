import { CACHE_MAX_SIZE, CACHE_CLEANUP_INTERVAL } from '../config.js';

// In-memory cache with TTL support, periodic cleanup, and size limits
const cache = new Map();
let cleanupInterval = null;

// Track cache statistics
const stats = {
  hits: 0,
  misses: 0,
  evictions: 0
};

export function get(key) {
  const entry = cache.get(key);
  if (!entry) {
    stats.misses++;
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    stats.misses++;
    return null;
  }
  // Update access time for LRU
  entry.lastAccess = Date.now();
  stats.hits++;
  return entry.value;
}

export function set(key, value, ttlSeconds) {
  // Evict oldest entry if at capacity
  if (cache.size >= CACHE_MAX_SIZE && !cache.has(key)) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache.entries()) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      cache.delete(oldestKey);
      stats.evictions++;
    }
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
    lastAccess: Date.now()
  });
}

export function has(key) {
  return get(key) !== null;
}

export function clear() {
  cache.clear();
}

export function size() {
  return cache.size;
}

export function getStats() {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? Math.round((stats.hits / total) * 100) : 0;

  return {
    size: cache.size,
    maxSize: CACHE_MAX_SIZE,
    hits: stats.hits,
    misses: stats.misses,
    evictions: stats.evictions,
    hitRate,
    totalRequests: total
  };
}

// Periodic cleanup of expired entries
export function startCleanup(intervalMs = CACHE_CLEANUP_INTERVAL) {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Cache cleanup: removed ${removed} expired entries, ${cache.size} remaining`);
    }
  }, intervalMs);
}

export function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Auto-start cleanup
startCleanup();

export default { get, set, has, clear, size, getStats, startCleanup, stopCleanup };

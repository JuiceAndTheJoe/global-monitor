// In-memory cache with TTL support, periodic cleanup, and size limits
const cache = new Map();
const MAX_CACHE_SIZE = 100;
let cleanupInterval = null;

export function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // Update access time for LRU
  entry.lastAccess = Date.now();
  return entry.value;
}

export function set(key, value, ttlSeconds) {
  // Evict oldest entry if at capacity
  if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache.entries()) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
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

// Periodic cleanup of expired entries
export function startCleanup(intervalMs = 60000) {
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

export default { get, set, has, clear, size, startCleanup, stopCleanup };

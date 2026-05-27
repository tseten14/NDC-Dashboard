const stats = {
  hits: 0,
  misses: 0,
  registeredSize: 0,
};

export function recordCacheAccess({ hit }) {
  if (hit) stats.hits += 1;
  else stats.misses += 1;
}

export function setRegisteredCacheSize(size) {
  stats.registeredSize = size;
}

export function getCacheMetrics() {
  const total = stats.hits + stats.misses;
  return {
    hit_rate: total > 0 ? +(stats.hits / total).toFixed(4) : null,
    size: stats.registeredSize,
    hits: stats.hits,
    misses: stats.misses,
  };
}

export function getPropertyFromCacheOrComputation<T, K>(
  cache: Map<K, T>,
  key: K,
  computation: () => T,
  useCache = true
): T {
  if (cache.has(key) && useCache) {
    return cache.get(key) as T
  } else {
    const result = computation()
    cache.set(key, result)
    return result
  }
}

export function getPropertyFromDoubleCacheOrComputation<T, K0, K1>(
  cache: Map<K0, Map<K1, T>>,
  key0: K0,
  key1: K1,
  computation: () => T,
  useCache = true
): T {
  if (cache.get(key0)?.has(key1) && useCache) {
    return cache.get(key0)?.get(key1) as T
  } else {
    const result = computation()
    if (!cache.get(key0)) {
      cache.set(key0, new Map())
    }
    cache.get(key0)?.set(key1, result)
    return result
  }
}

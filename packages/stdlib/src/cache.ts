export function getPropertyFromCacheOrComputation<T, K>(
  cache: Map<K, T>,
  key: K,
  computation: () => T,
  checkUse: (t: T) => boolean = () => true,
  checkStore: (t: T) => boolean = () => true
): T {
  if (cache.has(key) && checkUse(cache.get(key) as T)) {
    return cache.get(key) as T
  } else {
    const result = computation()
    if (checkStore(result)) {
      cache.set(key, result)
    }
    return result
  }
}

export function getPropertyFromDoubleCacheOrComputation<T, K0, K1>(
  cache: Map<K0, Map<K1, T>>,
  key0: K0,
  key1: K1,
  computation: () => T,
  checkUse: (t: T) => boolean = () => true,
  checkStore: (t: T) => boolean = () => true
): T {
  if (cache.get(key0)?.has(key1) && checkUse(cache.get(key0)?.get(key1) as T)) {
    return cache.get(key0)?.get(key1) as T
  } else {
    const result = computation()
    if (checkStore(result)) {
      if (!cache.get(key0)) {
        cache.set(key0, new Map())
      }
      cache.get(key0)?.set(key1, result)
    }
    return result
  }
}

export function getPropertyFromTripleCacheOrComputation<T, K0, K1, K2>(
  cache: Map<K0, Map<K1, Map<K2, T>>>,
  key0: K0,
  key1: K1,
  key2: K2,
  computation: () => T,
  checkUse: (t: T) => boolean = () => true,
  checkStore: (t: T) => boolean = () => true
): T {
  if (
    cache.get(key0)?.get(key1)?.has(key2) &&
    checkUse(cache.get(key0)?.get(key1)?.get(key2) as T)
  ) {
    return cache.get(key0)?.get(key1)?.get(key2) as T
  } else {
    const result = computation()
    if (checkStore(result)) {
      if (!cache.get(key0)) {
        cache.set(key0, new Map())
      }
      if (!cache.get(key0)?.get(key1)) {
        cache.get(key0)?.set(key1, new Map())
      }
      cache.get(key0)?.get(key1)?.set(key2, result)
    }
    return result
  }
}

export function getPropertyFromQuadrupleCacheOrComputation<T, K0, K1, K2, K3>(
  cache: Map<K0, Map<K1, Map<K2, Map<K3, T>>>>,
  key0: K0,
  key1: K1,
  key2: K2,
  key3: K3,
  computation: () => T,
  checkUse: (t: T) => boolean = () => true,
  checkStore: (t: T) => boolean = () => true
): T {
  if (
    cache.get(key0)?.get(key1)?.get(key2)?.has(key3) &&
    checkUse(cache.get(key0)?.get(key1)?.get(key2)?.get(key3) as T)
  ) {
    return cache.get(key0)?.get(key1)?.get(key2)?.get(key3) as T
  } else {
    const result = computation()
    if (checkStore(result)) {
      if (!cache.get(key0)) {
        cache.set(key0, new Map())
      }
      if (!cache.get(key0)?.get(key1)) {
        cache.get(key0)?.set(key1, new Map())
      }
      if (!cache.get(key0)?.get(key1)?.get(key2)) {
        cache.get(key0)?.get(key1)?.set(key2, new Map())
      }
      cache.get(key0)?.get(key1)?.get(key2)?.set(key3, result)
    }
    return result
  }
}

export function getPropertyFromQuintupleCacheOrComputation<
  T,
  K0,
  K1,
  K2,
  K3,
  K4
>(
  cache: Map<K0, Map<K1, Map<K2, Map<K3, Map<K4, T>>>>>,
  key0: K0,
  key1: K1,
  key2: K2,
  key3: K3,
  key4: K4,
  computation: () => T,
  checkUse: (t: T) => boolean = () => true,
  checkStore: (t: T) => boolean = () => true
): T {
  if (
    cache.get(key0)?.get(key1)?.get(key2)?.get(key3)?.has(key4) &&
    checkUse(cache.get(key0)?.get(key1)?.get(key2)?.get(key3)?.get(key4) as T)
  ) {
    return cache.get(key0)?.get(key1)?.get(key2)?.get(key3)?.get(key4) as T
  } else {
    const result = computation()
    if (checkStore(result)) {
      if (!cache.get(key0)) {
        cache.set(key0, new Map())
      }
      if (!cache.get(key0)?.get(key1)) {
        cache.get(key0)?.set(key1, new Map())
      }
      if (!cache.get(key0)?.get(key1)?.get(key2)) {
        cache.get(key0)?.get(key1)?.set(key2, new Map())
      }
      if (!cache.get(key0)?.get(key1)?.get(key2)?.get(key3)) {
        cache.get(key0)?.get(key1)?.get(key2)?.set(key3, new Map())
      }
      cache.get(key0)?.get(key1)?.get(key2)?.get(key3)?.set(key4, result)
    }
    return result
  }
}

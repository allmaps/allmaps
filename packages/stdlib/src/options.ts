export function mergeOptions<Options0, Options1>(
  options: Options0,
  partialOptions?: Options1
): Options0 & Options1 {
  // This function serves two purposes:
  // 1) Speedup: spreading is a little expensive, so it checks if necessary first
  // (e.g. it was previously executed for every point in transform,
  // where this was a 50% speed increase when transforming a lot of points
  // 2) It allows partialOptions to be undefined, which simplifies handing over a simple spread

  if (!partialOptions) {
    return options as Options0 & Options1
  }

  return {
    ...options,
    ...partialOptions
  }
}

export function mergeOptionsUnlessUndefined<
  Options0,
  Options1 extends Record<string, any>
>(
  options: Options0,
  partialOptions?: Options1
): Options0 &
  Partial<{
    [K in keyof Options1]: Exclude<Options1[K], undefined>
  }> {
  if (!partialOptions) {
    return options as Options0 &
      Partial<{
        [K in keyof Options1]: Exclude<Options1[K], undefined>
      }>
  }

  // Only overwrite properties that are not undefined
  for (const key in partialOptions) {
    const value = partialOptions[key as keyof Options1]
    if (value !== undefined) {
      ;(options as any)[key] = value
    }
  }

  return options as Options0 &
    Partial<{
      [K in keyof Options1]: Exclude<Options1[K], undefined>
    }>
}

export function mergePartialOptions<Options>(
  ...partialOptionsArray: (Partial<Options> | undefined)[]
): Partial<Options> {
  const definedPartialOptionsArray = partialOptionsArray.filter(
    (partialOptions) => partialOptions !== undefined && partialOptions !== null
  )
  if (definedPartialOptionsArray.length === 0) {
    return {}
  } else if (definedPartialOptionsArray.length === 1) {
    return definedPartialOptionsArray[0]
  } else {
    // This spreads out eacht of the partialOptions
    return Object.assign({}, ...definedPartialOptionsArray)
  }
}

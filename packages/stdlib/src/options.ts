/* eslint-disable @typescript-eslint/no-explicit-any */

export function mergeOptions<
  T extends Record<string, any>,
  U extends Array<Record<string, any> | undefined>
>(baseOptions: T, ...additionalPartialOptions: U): T & U[number] {
  // A specific function for merging options:
  // - Assure the output extends the type of the first element (e.g. default options)
  // - Speedup: spreading is a little expensive, so it checks if necessary first
  // (e.g. it was previously executed for every point in transform,
  // where this was a 50% speed increase when transforming a lot of points
  // - Allow additionalOptions to be undefined, which simplifies handing over a simple spread

  return {
    ...baseOptions,
    ...mergePartialOptions(...additionalPartialOptions)
  }
}

export function mergePartialOptions<
  U extends Array<Record<string, any> | undefined>
>(...partialOptions: U): Partial<U[number]> {
  const definedPartialOptionsArray = partialOptions.filter(
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

export function removeUndefinedOptions<
  U extends Array<Record<string, any> | undefined>
>(
  ...optionsArray: U
): Partial<{ [K in keyof U[number]]: Exclude<U[number][K], undefined> }> {
  const mergedOptions: Record<string, any> = {}

  for (let i = 0; i < optionsArray.length; i++) {
    const options = optionsArray[i]
    if (!options) continue

    for (const key in options) {
      const value = options[key]
      if (value !== undefined) {
        mergedOptions[key] = value
      }
    }
  }

  return mergedOptions as Partial<{
    [K in keyof U[number]]: Exclude<U[number][K], undefined>
  }>
}

// Note: not using Exclude here like we do in removeUndefinedOptions,
// since TypeScript often inferes too strict types
export function mergeOptionsUnlessUndefined<
  T extends Record<string, any>,
  U extends Record<string, any>
>(
  baseOptions: T,
  ...additionalOptions: Array<Partial<U> | undefined>
): T & Partial<U> {
  return {
    ...baseOptions,
    ...removeUndefinedOptions(...additionalOptions)
  } as T & Partial<U>
}

export function mergeTwoOptionsUnlessUndefined<
  T extends Record<string, any>,
  U extends Record<string, any>
>(baseOptions: T, additionalOption: Partial<U> | undefined): T & Partial<U> {
  if (!additionalOption || Object.keys(additionalOption).length === 0) {
    return baseOptions as T & Partial<U>
  }

  // Build a filtered copy, excluding omitted keys and undefined values
  const filtered: Partial<U> = {}
  for (const key in additionalOption) {
    if (additionalOption[key] !== undefined) {
      filtered[key] = additionalOption[key]
    }
  }

  return {
    ...baseOptions,
    ...filtered
  } as T & Partial<U>
}

export function optionKeysToUndefinedOptions<T extends readonly string[]>(
  optionKeys: T | undefined
): undefined | Record<T[number], undefined> {
  if (optionKeys === undefined) {
    return undefined
  }
  return optionKeys.reduce(
    (acc, curr) => ((acc[curr as T[number]] = undefined), acc),
    {} as Record<T[number], undefined>
  )
}

export function optionKeysByMapIdToUndefinedOptionsByMapId<
  T extends readonly string[]
>(
  optionKeysByMapId: Map<string, T> | undefined
): undefined | Map<string, Record<T[number], undefined>> {
  if (optionKeysByMapId === undefined) {
    return undefined
  }
  const optionsByMapId = new Map<string, Record<T[number], undefined>>()
  for (const mapId of optionKeysByMapId.keys()) {
    const optionKeys = optionKeysByMapId.get(mapId)!
    optionsByMapId.set(mapId, optionKeysToUndefinedOptions(optionKeys)!)
  }

  return optionsByMapId
}

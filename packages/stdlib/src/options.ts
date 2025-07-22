/* eslint-disable @typescript-eslint/no-explicit-any */

import { add } from 'lodash-es'

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
  const mergedOptions = {}
  for (const options of optionsArray) {
    if (!options) {
      continue
    }

    for (const key in options) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        const value = options[key]

        if (value !== undefined) {
          ;(mergedOptions as any)[key] = value
        }
      }
    }
  }

  return mergedOptions as Partial<{
    [K in keyof U[number]]: Exclude<U[number][K], undefined>
  }>
}

export function mergeOptionsUnlessUndefined<
  T extends Record<string, any>,
  U extends Array<Record<string, any> | undefined>
>(
  baseOptions: T,
  ...additionalOptions: U
): T & Partial<{ [K in keyof U[number]]: Exclude<U[number][K], undefined> }> {
  return {
    ...baseOptions,
    ...removeUndefinedOptions(...additionalOptions)
  }
}

// // Original version of mergeOptionsUnlessUndefined
// // Saving this here, may be useful later
// export function mergeOptionsUnlessUndefined<
//   Options0,
//   Options1 extends Record<string, any>
// >(
//   options0: Options0,
//   options1?: Options1
// ): Options0 &
//   Partial<{
//     [K in keyof Options1]: Exclude<Options1[K], undefined>
//   }> {
//   if (!options1) {
//     return options0 as Options0 &
//       Partial<{
//         [K in keyof Options1]: Exclude<Options1[K], undefined>
//       }>
//   }

//   // Only overwrite properties that are not undefined
//   for (const key in options1) {
//     const value = options1[key as keyof Options1]
//     if (value !== undefined) {
//       ;(options0 as any)[key] = value
//     }
//   }

//   return options0 as Options0 &
//     Partial<{
//       [K in keyof Options1]: Exclude<Options1[K], undefined>
//     }>
// }

// // Attempt to create a mergeOptionsDeep function
// // Saving this here, may be useful later
// export function mergeOptionsDeep<
//   Option0 extends Record<string, any>,
//   Option1 extends Record<string, any>
// >(option0: Option0, option1: Option1): Option0 & Option1 {
//   // Create a new object to avoid mutating either input
//   const output = { ...option0 } as Record<string, any>

//   if (isObject(option0) && isObject(option1)) {
//     Object.keys(option1).forEach((key) => {
//       const sourceValue = option1[key as keyof Option1]

//       if (isObject(sourceValue)) {
//         // If both target and source have the same key and both are objects, recursively merge
//         if (key in option0 && isObject(option0[key as keyof Option0])) {
//           output[key] = mergeOptionsDeep(
//             option0[key as keyof Option0] as Record<string, any>,
//             sourceValue as Record<string, any>
//           )
//         } else {
//           // Otherwise just clone the source object
//           output[key] = { ...sourceValue }
//         }
//       } else {
//         // For non-object values, simply copy from source
//         output[key] = sourceValue
//       }
//     })
//   }

//   return output as Option0 & Option1
// }

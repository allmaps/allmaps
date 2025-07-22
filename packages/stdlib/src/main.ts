import {
  differenceWith,
  fromPairs,
  toPairs,
  isEqual,
  cloneDeep,
  pick
} from 'lodash-es'

export function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

// Define vanilla groupBy function, since official one is only baseline 2024
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
// Vanilla code from https://stackoverflow.com/a/62765924/2386673
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupBy<T, K extends keyof any>(arr: T[], key: (i: T) => K) {
  return arr.reduce(
    (groups, item) => {
      ;(groups[key(item)] ||= []).push(item)
      return groups
    },
    {} as Record<K, T[]>
  )
}

// Note: this checks equality of the object
// which is only a good idea for primitive types (string, number), not JSON objects
export function isEqualArray<T>(
  array0: T[],
  array1: T[],
  isEqualObject: (t0: T, t1: T) => boolean = (t0, t1) => t0 == t1
): boolean {
  if (array0.length !== array1.length) {
    return false
  }
  for (let i = 0; i < array0.length; i++) {
    if (!isEqualObject(array0[i], array1[i])) {
      return false
    }
  }
  return true
}

// Returns objects in array0 that are not in array1
export function arrayDifference<T>(
  array0: T[],
  array1: T[],
  isEqualObject: (t0: T, t1: T) => boolean = (t0, t1) => t0 == t1
): T[] {
  const result = []
  for (let i = 0; i < array0.length; i++) {
    let found = false
    for (let j = 0; j < array1.length; j++) {
      if (isEqualObject(array0[i], array1[j])) {
        found = true
        break
      }
    }
    if (!found) {
      result.push(array0[i])
    }
  }
  return result
}

export function arrayUnique<T>(
  array: T[],
  isEqualObject: (t0: T, t1: T) => boolean = (t0, t1) => t0 == t1
) {
  const result = []
  for (let i = 0; i < array.length; i++) {
    let found = false
    for (let j = 0; j < i; j++) {
      if (isEqualObject(array[i], array[j])) {
        found = true
        break
      }
    }
    if (!found) {
      result.push(array[i])
    }
  }
  return result
}

export function arrayRepeated<T>(
  array: T[],
  isEqualObject: (t0: T, t1: T) => boolean = (t0, t1) => t0 == t1
) {
  const result = []
  for (let i = 0; i < array.length; i++) {
    let found = false
    for (let j = 0; j < i; j++) {
      if (isEqualObject(array[i], array[j])) {
        found = true
        break
      }
    }
    if (found) {
      result.push(array[i])
    }
  }
  return result
}

// TODO: replace with Set subset once available
// Note: this checks equality of the object
// which is only a good idea for primitive types (string, number), not JSON objects
export function subSetArray<T>(arr1: Array<T>, arr2: Array<T>): boolean {
  for (let i = 0; i < arr2.length; i++) {
    if (arr1.indexOf(arr2[i]) === -1) {
      return false
    }
  }
  return true
}

// TODO: Replace with Set equality once available
// Note: this checks equality of the object
// which is only a good idea for primitive types (string, number), not JSON objects
export function equalSet<T>(set1: Set<T> | null, set2: Set<T> | null): boolean {
  if (!set1 || !set2) {
    return false
  }
  if (set1.size !== set2.size) {
    return false
  }
  return [...set1].every((x) => set2.has(x))
}

// From https://gist.github.com/Yimiprod/7ee176597fef230d1451
export function objectDifference(
  newObject: object,
  baseObject: object
): object {
  return fromPairs(
    differenceWith(toPairs(newObject), toPairs(baseObject), isEqual)
  )
}

export function objectOmitDifference(
  newObject: object,
  baseObject: object
): object {
  const keysToOmit = Object.keys(objectDifference(newObject, baseObject))
  return pick(newObject, keysToOmit)
}

// Basic omit function as replacement for lodash omit, since it will be removed in v5
// See: https://github.com/lodash/lodash/issues/2930#issuecomment-272298477
export function omit<T extends Record<string, any>>(
  object: T,
  keys: string[]
): Partial<T> {
  const result = cloneDeep(object) as T
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export function maxOfNumberOrUndefined(
  number1: number | undefined,
  number2: number | undefined
): number | undefined {
  if (number1 !== undefined && number2 !== undefined) {
    return Math.max(number1, number2)
  } else if (number1 !== undefined) {
    return number1
  } else if (number2 !== undefined) {
    return number2
  }
}

export function isValidHttpUrl(string: string) {
  let url

  try {
    url = new URL(string)
  } catch (_) {
    return false
  }

  return url.protocol === 'http:' || url.protocol === 'https:'
}

export function camelCaseToWords(string: string): string {
  const result = string.replace(/([A-Z])/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

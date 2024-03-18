export function equalArray<T>(
  arr1: Array<T> | null,
  arr2: Array<T> | null
): boolean {
  if (!arr1 || !arr2) {
    return false
  }
  if (arr1.length !== arr2.length) {
    return false
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }
  return true
}

export function equalSet<T>(set1: Set<T> | null, set2: Set<T> | null): boolean {
  if (!set1 || !set2) {
    return false
  }
  if (set1.size !== set2.size) {
    return false
  }
  return [...set1].every((x) => set2.has(x))
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

export function arrayToUniqueObjectsArrayAndIndicesArray<T>(
  arr: T[],
  equalsFunction: (obj0: T, obj1: T) => boolean
) {
  const uniqueObjects = []
  const indices = []

  for (let i = 0; i < arr.length; i++) {
    let isDuplicate = false

    // Check if current object is a duplicate of any existing unique object
    for (let j = 0; j < uniqueObjects.length; j++) {
      if (equalsFunction(arr[i], uniqueObjects[j])) {
        isDuplicate = true
        indices.push(j)
        break
      }
    }

    // If not a duplicate, add it to unique objects array
    if (!isDuplicate) {
      uniqueObjects.push(arr[i])
      indices.push(uniqueObjects.length - 1)
    }
  }

  return { uniqueObjects, indices }
}

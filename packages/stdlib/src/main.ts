export function equalArray<T>(arr1: Array<T> | null, arr2: Array<T> | null) {
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

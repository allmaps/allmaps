import { expect } from 'vitest'

declare module 'vitest' {
  interface Assertion<T = any> {
    toRoughlyEqual(expected: any, precision: number): void
    toRoughlyEqualText(expected: string, decimalPlaces: number): void
  }
  interface AsymmetricMatchersContaining {
    toRoughlyEqual(expected: any, precision: number): void
    toRoughlyEqualText(expected: string, decimalPlaces: number): void
  }
}

function deepEqualWithPrecision(
  actual: any,
  expected: any,
  precision: number,
  path: string = 'root'
): {
  pass: boolean
  failPath?: string
  actualValue?: any
  expectedValue?: any
} {
  // Handle null/undefined
  if (actual === expected) {
    return { pass: true }
  }

  if (actual == null || expected == null) {
    return {
      pass: false,
      failPath: path,
      actualValue: actual,
      expectedValue: expected
    }
  }

  // Handle numbers with precision
  if (typeof actual === 'number' && typeof expected === 'number') {
    const diff = Math.abs(actual - expected)
    // Use precision as the threshold directly
    const pass = diff <= precision

    if (!pass) {
      return {
        pass: false,
        failPath: path,
        actualValue: actual,
        expectedValue: expected
      }
    }
    return { pass: true }
  }

  // Handle arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      return {
        pass: false,
        failPath: `${path}.length`,
        actualValue: actual.length,
        expectedValue: expected.length
      }
    }

    for (let i = 0; i < actual.length; i++) {
      const result = deepEqualWithPrecision(
        actual[i],
        expected[i],
        precision,
        `${path}[${i}]`
      )
      if (!result.pass) {
        return result
      }
    }
    return { pass: true }
  }

  // Handle objects
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual)
    const expectedKeys = Object.keys(expected)

    if (actualKeys.length !== expectedKeys.length) {
      return {
        pass: false,
        failPath: `${path} (key count)`,
        actualValue: actualKeys.length,
        expectedValue: expectedKeys.length
      }
    }

    for (const key of actualKeys) {
      if (!(key in expected)) {
        return {
          pass: false,
          failPath: `${path}.${key}`,
          actualValue: 'missing in expected',
          expectedValue: undefined
        }
      }

      const result = deepEqualWithPrecision(
        actual[key],
        expected[key],
        precision,
        `${path}.${key}`
      )
      if (!result.pass) {
        return result
      }
    }
    return { pass: true }
  }

  // Default equality for other types
  const pass = actual === expected
  return pass
    ? { pass: true }
    : {
        pass: false,
        failPath: path,
        actualValue: actual,
        expectedValue: expected
      }
}

expect.extend({
  toRoughlyEqual(received: any, expected: any, precision: number) {
    const result = deepEqualWithPrecision(received, expected, precision)

    if (!result.pass) {
      const diff =
        typeof result.actualValue === 'number' &&
        typeof result.expectedValue === 'number'
          ? Math.abs(result.actualValue - result.expectedValue)
          : 'N/A'

      return {
        pass: false,
        message: () =>
          `Expected values to roughly equal (precision: ${precision})\n\n` +
          `Path: ${result.failPath}\n` +
          `Expected: ${result.expectedValue}\n` +
          `Received: ${result.actualValue}\n` +
          `Diff: ${diff}\n`
      }
    }

    return {
      pass: true,
      message: () => ''
    }
  },

  toRoughlyEqualText(
    received: string,
    expected: string,
    decimalPlaces: number
  ) {
    const { isNot } = this

    // Function to normalize floating point numbers to specified decimal places
    const normalizeNumbers = (text: string, decimalPlaces: number): string => {
      // Match floating point numbers (including scientific notation)
      // Matches numbers that are preceded/followed by non-alphanumeric chars (or start/end)
      const floatRegex =
        /(?<![a-zA-Z0-9])[-+]?(?:\d+\.?\d*|\d*\.\d+)(?:[eE][-+]?\d+)?(?![a-zA-Z0-9])/g

      return text.replace(floatRegex, (match) => {
        const num = parseFloat(match)

        // If it's not a valid number, return as-is
        if (isNaN(num)) {
          return match
        }

        // Format with fixed decimal places
        return num.toFixed(decimalPlaces)
      })
    }

    const normalizedReceived = normalizeNumbers(received, decimalPlaces)
    const normalizedExpected = normalizeNumbers(expected, decimalPlaces)

    const pass = normalizedReceived === normalizedExpected

    if (!pass) {
      // Generate a line-by-line diff
      const expectedLines = normalizedExpected.split('\n')
      const receivedLines = normalizedReceived.split('\n')
      const maxLines = Math.max(expectedLines.length, receivedLines.length)

      const diff: string[] = []
      for (let i = 0; i < maxLines; i++) {
        const expLine = expectedLines[i] ?? ''
        const recLine = receivedLines[i] ?? ''

        if (expLine !== recLine) {
          diff.push(`Line ${i + 1}:`)
          diff.push(`- Expected: ${expLine}`)
          diff.push(`+ Received: ${recLine}`)
        }
      }

      return {
        pass: false,
        message: () =>
          `Text does not match after normalizing numbers to ${decimalPlaces} decimal places.\n\n${diff.join('\n')}`
      }
    }

    return {
      pass: true,
      message: () =>
        `Expected text ${isNot ? 'not ' : ''}to roughly equal with ${decimalPlaces} decimal places`
    }
  }
})

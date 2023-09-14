import { expect } from 'chai'

const EPSILON = 0.00001

export function expectToBeCloseToArray(
  actual: number[],
  expected: number[],
  epsilon = EPSILON
) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n, i) => expect(n).to.be.approximately(expected[i], epsilon))
}

export function expectToBeCloseToArrayArray(
  actual: number[][],
  expected: number[][],
  epsilon = EPSILON
) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n0, i0) => expectToBeCloseToArray(n0, expected[i0], epsilon))
}

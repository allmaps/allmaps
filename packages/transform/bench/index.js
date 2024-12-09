/* eslint-disable @typescript-eslint/no-unused-vars */
import { GcpTransformer } from '../dist/index.js'

import { generalGcps10 } from '../test/input/gcps-test.js'

let start, ops

function logBenchmarkCreateGcpTransformer(input, type) {
  start = Date.now()
  ops = 0
  while (Date.now() - start < 1000) {
    const transformer = new GcpTransformer(input, type)
    transformer.transformToGeo([100, 100])
    ops++
  }
  console.log(
    Math.round((ops * 1000) / (Date.now() - start)) +
      ' ops/s to create ' +
      type +
      ' transformer with ' +
      input.length +
      ' points (and transform 1 point)'
  )
}

logBenchmarkCreateGcpTransformer(generalGcps10, 'helmert')
logBenchmarkCreateGcpTransformer(generalGcps10, 'polynomial1')
logBenchmarkCreateGcpTransformer(generalGcps10, 'polynomial2')
logBenchmarkCreateGcpTransformer(generalGcps10, 'polynomial3')
logBenchmarkCreateGcpTransformer(generalGcps10, 'thinPlateSpline')
logBenchmarkCreateGcpTransformer(generalGcps10, 'projective')

function logBenchmarkUseGcpTransformer(input, type) {
  start = Date.now()
  ops = 0
  const transformer = new GcpTransformer(input, type)
  while (Date.now() - start < 1000) {
    transformer.transformToGeo([100, 100])
    ops++
  }
  console.log(
    Math.round((ops * 1000) / (Date.now() - start)) +
      ' ops/s to use ' +
      type +
      ' transformer made with with ' +
      input.length +
      ' points'
  )
}

logBenchmarkUseGcpTransformer(generalGcps10, 'helmert')
logBenchmarkUseGcpTransformer(generalGcps10, 'polynomial1')
logBenchmarkUseGcpTransformer(generalGcps10, 'polynomial2')
logBenchmarkUseGcpTransformer(generalGcps10, 'polynomial3')
logBenchmarkUseGcpTransformer(generalGcps10, 'thinPlateSpline')
logBenchmarkUseGcpTransformer(generalGcps10, 'projective')

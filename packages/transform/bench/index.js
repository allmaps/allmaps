/* eslint-disable @typescript-eslint/no-unused-vars */
import { GcpTransformer } from '../dist/index.js'

import { transformGcps10 } from '../test/input/gcps-test.js'

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

logBenchmarkCreateGcpTransformer(transformGcps10, 'helmert')
logBenchmarkCreateGcpTransformer(transformGcps10, 'polynomial1')
logBenchmarkCreateGcpTransformer(transformGcps10, 'polynomial2')
logBenchmarkCreateGcpTransformer(transformGcps10, 'polynomial3')
logBenchmarkCreateGcpTransformer(transformGcps10, 'thinPlateSpline')
logBenchmarkCreateGcpTransformer(transformGcps10, 'projective')

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

logBenchmarkUseGcpTransformer(transformGcps10, 'helmert')
logBenchmarkUseGcpTransformer(transformGcps10, 'polynomial1')
logBenchmarkUseGcpTransformer(transformGcps10, 'polynomial2')
logBenchmarkUseGcpTransformer(transformGcps10, 'polynomial3')
logBenchmarkUseGcpTransformer(transformGcps10, 'thinPlateSpline')
logBenchmarkUseGcpTransformer(transformGcps10, 'projective')

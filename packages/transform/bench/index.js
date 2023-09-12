/* eslint-disable @typescript-eslint/no-unused-vars */
import { GCPTransformer } from '../dist/index.js'

import { transformGcps10 } from '../test/input/gcps-test.js'

let start, ops

function logBenchmarkCreateGCPTransformer(input, type) {
  start = Date.now()
  ops = 0
  while (Date.now() - start < 1000) {
    const transformer = new GCPTransformer(input, type)
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

logBenchmarkCreateGCPTransformer(transformGcps10, 'helmert')
logBenchmarkCreateGCPTransformer(transformGcps10, 'polynomial1')
logBenchmarkCreateGCPTransformer(transformGcps10, 'polynomial2')
logBenchmarkCreateGCPTransformer(transformGcps10, 'polynomial3')
logBenchmarkCreateGCPTransformer(transformGcps10, 'thinPlateSpline')
logBenchmarkCreateGCPTransformer(transformGcps10, 'projective')

function logBenchmarkUseGCPTransformer(input, type) {
  start = Date.now()
  ops = 0
  const transformer = new GCPTransformer(input, type)
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

logBenchmarkUseGCPTransformer(transformGcps10, 'helmert')
logBenchmarkUseGCPTransformer(transformGcps10, 'polynomial1')
logBenchmarkUseGCPTransformer(transformGcps10, 'polynomial2')
logBenchmarkUseGCPTransformer(transformGcps10, 'polynomial3')
logBenchmarkUseGCPTransformer(transformGcps10, 'thinPlateSpline')
logBenchmarkUseGCPTransformer(transformGcps10, 'projective')

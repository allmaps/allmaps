/* eslint-disable @typescript-eslint/no-unused-vars */
import { GCPTransformer } from '../dist/index.js'

import { gcps_10 } from '../test/input/gcps-test.js'

let start, ops

function logBenchmarkCreateGCPTransformer(input, type) {
  start = Date.now()
  ops = 0
  while (Date.now() - start < 1000) {
    const transformer = new GCPTransformer(input, type)
    transformer.toWorld([100, 100])
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

logBenchmarkCreateGCPTransformer(gcps_10, 'helmert')
logBenchmarkCreateGCPTransformer(gcps_10, 'polynomial1')
logBenchmarkCreateGCPTransformer(gcps_10, 'polynomial2')
logBenchmarkCreateGCPTransformer(gcps_10, 'polynomial3')
logBenchmarkCreateGCPTransformer(gcps_10, 'thin-plate-spline')
logBenchmarkCreateGCPTransformer(gcps_10, 'projective')

function logBenchmarkUseGCPTransformer(input, type) {
  start = Date.now()
  ops = 0
  const transformer = new GCPTransformer(input, type)
  while (Date.now() - start < 1000) {
    transformer.toWorld([100, 100])
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

logBenchmarkUseGCPTransformer(gcps_10, 'helmert')
logBenchmarkUseGCPTransformer(gcps_10, 'polynomial1')
logBenchmarkUseGCPTransformer(gcps_10, 'polynomial2')
logBenchmarkUseGCPTransformer(gcps_10, 'polynomial3')
logBenchmarkUseGCPTransformer(gcps_10, 'thin-plate-spline')
logBenchmarkUseGCPTransformer(gcps_10, 'projective')

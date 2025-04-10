/* eslint-disable @typescript-eslint/no-unused-vars */
import { ProjectedGcpTransformer } from '../dist/index.js'

import { gcps10 } from '../test/input/gcps-test.js'

let start, ops

function logBenchmarkCreateGcpTransformer(input, type) {
  start = Date.now()
  ops = 0
  while (Date.now() - start < 1000) {
    const projectedTransformer = new ProjectedGcpTransformer(input, type)
    projectedTransformer.getToGeoTransformation()
    ops++
  }
  console.log(
    '| ' + type + ' | ' + Math.round((ops * 1000) / (Date.now() - start)) + ' |'
  )
}

console.log(
  'To create a projected transformer (with ' +
    gcps10.length +
    " points) and compute its 'toGeo' transformation:\n"
)
console.log('| Type              | Ops/s  |')
console.log('|-------------------|--------|')
logBenchmarkCreateGcpTransformer(gcps10, 'helmert')
logBenchmarkCreateGcpTransformer(gcps10, 'polynomial1')
logBenchmarkCreateGcpTransformer(gcps10, 'polynomial2')
logBenchmarkCreateGcpTransformer(gcps10, 'polynomial3')
logBenchmarkCreateGcpTransformer(gcps10, 'thinPlateSpline')
logBenchmarkCreateGcpTransformer(gcps10, 'projective')

function logBenchmarkUseGcpTransformer(input, type) {
  start = Date.now()
  ops = 0
  const projectedTransformer = new ProjectedGcpTransformer(input, type)
  projectedTransformer.getToGeoTransformation()
  while (Date.now() - start < 1000) {
    projectedTransformer.transformToGeo([100, 100])
    ops++
  }
  console.log(
    '| ' + type + ' | ' + Math.round((ops * 1000) / (Date.now() - start)) + ' |'
  )
}

console.log('\n')

console.log(
  'To use a projected transformer (with ' +
    gcps10.length +
    " points, and its 'toGeo' transformation already computed) and transform a point 'toGeo':\n"
)
console.log('| Type              | Ops/s  |')
console.log('|-------------------|--------|')
logBenchmarkUseGcpTransformer(gcps10, 'helmert')
logBenchmarkUseGcpTransformer(gcps10, 'polynomial1')
logBenchmarkUseGcpTransformer(gcps10, 'polynomial2')
logBenchmarkUseGcpTransformer(gcps10, 'polynomial3')
logBenchmarkUseGcpTransformer(gcps10, 'thinPlateSpline')
logBenchmarkUseGcpTransformer(gcps10, 'projective')

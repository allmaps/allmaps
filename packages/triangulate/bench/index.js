import { triangulate } from '../dist/index.js'

let start, ops, result

const polygon = [
  [
    [138, 32],
    [77, 35],
    [43, 74],
    [27, 130],
    [61, 169],
    [120, 160],
    [135, 110],
    [170, 124],
    [212, 154],
    [238, 74]
  ]
]

function logBenchmark(polygon, distance) {
  start = Date.now()
  ops = 0
  while (Date.now() - start < 1000) {
    triangulate(polygon, distance)
    ops++
  }
  result = triangulate(polygon, distance)
  console.log(
    Math.round((ops * 1000) / (Date.now() - start)) +
      ' ops/s to compute ' +
      result.length +
      ' triangles'
  )
}

logBenchmark(polygon, 1000)
logBenchmark(polygon, 100)
logBenchmark(polygon, 10)
logBenchmark(polygon, 1)

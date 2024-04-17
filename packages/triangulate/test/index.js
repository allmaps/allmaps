import { describe, it } from 'mocha'
import { expectToBeCloseToArrayArrayArray } from '../../stdlib/test/helper-functions.js'

import { triangulate, triangulateToUnique } from '../dist/index.js'

const rectangle = [
  [0.592, 0.953],
  [0.304, 2.394],
  [2.904, 2.201],
  [2.394, 0.232]
]
const rectangleNoDistanceResult = [
  [
    [0.304, 2.394],
    [0.592, 0.953],
    [2.904, 2.201]
  ],
  [
    [0.592, 0.953],
    [2.394, 0.232],
    [2.904, 2.201]
  ]
]
const rectangleDistanceResult = [
  [
    [1.3012562303117026, 2.3199729029037854],
    [0.304, 2.394],
    [1.304, 2.232]
  ],
  [
    [1.3012562303117026, 2.3199729029037854],
    [1.304, 2.232],
    [2.2985124606234053, 2.2459458058075707]
  ],
  [
    [2.2985124606234053, 2.2459458058075707],
    [1.304, 2.232],
    [2.3040000000000003, 2.232]
  ],
  [
    [2.2985124606234053, 2.2459458058075707],
    [2.3040000000000003, 2.232],
    [2.904, 2.201]
  ],
  [
    [2.3040000000000003, 2.232],
    [2.6532596580272494, 1.2329456208934397],
    [2.904, 2.201]
  ],
  [
    [2.3040000000000003, 2.232],
    [2.3040000000000003, 1.232],
    [2.6532596580272494, 1.2329456208934397]
  ],
  [
    [1.304, 2.232],
    [2.3040000000000003, 1.232],
    [2.3040000000000003, 2.232]
  ],
  [
    [1.304, 2.232],
    [1.304, 1.232],
    [2.3040000000000003, 1.232]
  ],
  [
    [0.3960147328390722, 1.933606840204503],
    [1.304, 1.232],
    [1.304, 2.232]
  ],
  [
    [0.3960147328390722, 1.933606840204503],
    [0.592, 0.953],
    [1.304, 1.232]
  ],
  [
    [1.304, 1.232],
    [0.592, 0.953],
    [1.4655588463411926, 0.6034795070965593]
  ],
  [
    [1.304, 1.232],
    [1.4655588463411926, 0.6034795070965593],
    [2.3040000000000003, 1.232]
  ],
  [
    [2.3040000000000003, 1.232],
    [1.4655588463411926, 0.6034795070965593],
    [2.402519316054499, 0.2648912417868794]
  ],
  [
    [2.3040000000000003, 1.232],
    [2.402519316054499, 0.2648912417868794],
    [2.6532596580272494, 1.2329456208934397]
  ],
  [
    [1.4655588463411926, 0.6034795070965593],
    [2.394, 0.232],
    [2.402519316054499, 0.2648912417868794]
  ],
  [
    [1.304, 2.232],
    [0.304, 2.394],
    [0.3960147328390722, 1.933606840204503]
  ]
]

const rectangleOnGrid = [
  [0, 0],
  [0, 2],
  [2, 2],
  [2, 0]
]
const rectangleOnGridNoDistanceResult = [
  [
    [0, 2],
    [2, 0],
    [2, 2]
  ],
  [
    [0, 2],
    [0, 0],
    [2, 0]
  ]
]

describe('Rectangle', async () => {
  it(`should work for average polygons with no distance provided`, () => {
    expectToBeCloseToArrayArrayArray(
      triangulate(rectangle),
      rectangleNoDistanceResult
    )
  })
  it(`should work for average polygons with a distance provided`, () => {
    expectToBeCloseToArrayArrayArray(
      triangulate(rectangle, 1),
      rectangleDistanceResult
    )
  })
  it(`should work with rectangles on grid (collinearity check) with no distance provided`, () => {
    expectToBeCloseToArrayArrayArray(
      triangulate(rectangleOnGrid),
      rectangleOnGridNoDistanceResult
    )
  })
  // // TODO
  // it(`should work with rectangles on grid (collinearity check) with a distance provided`, () => {
  //   console.log(triangulate(rectangleOnGrid, 1)) // for some reason this is giving a 'pointError', see poly2tri.js/src/pointerror.js
  //   expect(triangulate(rectangleOnGrid)).to.shallowDeepEqual(
  //     rectangleOnGridDistanceResult
  //   )
  // })
  it(`should work provide the same result when using unique points`, () => {
    const { uniquePointsIndexTriangles, uniquePoints } =
      triangulateToUnique(rectangle)
    const triangles = uniquePointsIndexTriangles.map((t) =>
      t.map((indexPoint) => uniquePoints[indexPoint])
    )
    expectToBeCloseToArrayArrayArray(triangles, rectangleNoDistanceResult)
  })
})

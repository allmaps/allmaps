import { describe, it } from 'mocha'
import { expectToBeCloseToArrayArrayArray } from '../../stdlib/test/helper-functions.js'

import { triangulate, triangulateToUnique } from '../dist/index.js'

const rectangle = [
  [0.592, 0.953],
  [0.304, 2.394],
  [2.904, 2.201],
  [2.394, 0.232]
]

const rectangleOnGrid = [
  [0, 0],
  [0, 2],
  [2, 2],
  [2, 0]
]

describe('Rectangle', async () => {
  it(`should work for average polygons with no distance provided`, () => {
    const output = [
      [
        [0.592, 0.953],
        [0.304, 2.394],
        [2.904, 2.201]
      ],
      [
        [2.904, 2.201],
        [2.394, 0.232],
        [0.592, 0.953]
      ]
    ]

    expectToBeCloseToArrayArrayArray(triangulate([rectangle]), output)
  })

  it(`should work for average polygons with a distance provided`, () => {
    const output = [
      [
        [1.304, 1.232],
        [1, 1],
        [1, 2]
      ],
      [
        [1, 2],
        [2.3040000000000003, 1.232],
        [1.304, 1.232]
      ],
      [
        [1, 1],
        [0, 2],
        [1, 2]
      ],
      [
        [1, 2],
        [0, 2],
        [1.304, 2.232]
      ],
      [
        [1.304, 1.232],
        [2, 0],
        [1, 1]
      ],
      [
        [3, 2],
        [2.3040000000000003, 1.232],
        [1, 2]
      ],
      [
        [1.304, 2.232],
        [2.3040000000000003, 2.232],
        [1, 2]
      ],
      [
        [2.3040000000000003, 1.232],
        [2, 0],
        [1.304, 1.232]
      ],
      [
        [2.3040000000000003, 2.232],
        [3, 2],
        [1, 2]
      ],
      [
        [2.3040000000000003, 1.232],
        [3, 1],
        [2, 0]
      ]
    ]
    expectToBeCloseToArrayArrayArray(triangulate([rectangle], 1), output)
  })

  it(`should remove sharp triangles using minimumTriangleAngle`, () => {
    const output = [
      [
        [1.304, 1.232],
        [1, 1],
        [1, 2]
      ],
      [
        [1, 2],
        [2.3040000000000003, 1.232],
        [1.304, 1.232]
      ],
      [
        [1, 1],
        [0, 2],
        [1, 2]
      ],
      [
        [1.304, 1.232],
        [2, 0],
        [1, 1]
      ],
      [
        [3, 2],
        [2.3040000000000003, 1.232],
        [1, 2]
      ],
      [
        [2.3040000000000003, 1.232],
        [2, 0],
        [1.304, 1.232]
      ],
      [
        [2.3040000000000003, 1.232],
        [3, 1],
        [2, 0]
      ]
    ]

    expectToBeCloseToArrayArrayArray(
      triangulate([rectangle], 1, { minimumTriangleAngle: 0.2 }),
      output
    )
  })

  it(`should work with rectangles on grid (collinearity check) with no distance provided`, () => {
    const output = [
      [
        [0, 0],
        [0, 2],
        [2, 2]
      ],
      [
        [2, 2],
        [2, 0],
        [0, 0]
      ]
    ]
    expectToBeCloseToArrayArrayArray(triangulate([rectangleOnGrid]), output)
  })

  it(`should work provide the same result when using unique points`, () => {
    const { uniquePointIndexTriangles, uniquePoints } = triangulateToUnique([
      rectangle
    ])
    const triangles = uniquePointIndexTriangles.map((t) =>
      t.map((indexPoint) => uniquePoints[indexPoint])
    )

    const output = [
      [
        [0.592, 0.953],
        [0.304, 2.394],
        [2.904, 2.201]
      ],
      [
        [2.904, 2.201],
        [2.394, 0.232],
        [0.592, 0.953]
      ]
    ]

    expectToBeCloseToArrayArrayArray(triangles, output)
  })
})

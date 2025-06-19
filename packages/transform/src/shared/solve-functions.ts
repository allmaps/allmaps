import Matrix, {
  inverse,
  pseudoInverse,
  SingularValueDecomposition
} from 'ml-matrix'

/**
 * Solve the x and y components jointly using PseudoInverse.
 *
 * This uses the 'Pseudo Inverse' to compute a 'best fit' (least squares) approximate solution
 * for the system of linear equations, which is (in general) over-defined and hence lacks an exact solution.
 * See https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
 *
 * This will result weightsArray shared by both components: [t_x, t_y, m, n]
 */
export function solveJointlyPseudoInverse(
  coefsArrayMatrices: [number[][], number[][]],
  destinationPointsArrays: [number[], number[]]
): number[] {
  const coefsMatrix = new Matrix([
    ...coefsArrayMatrices[0],
    ...coefsArrayMatrices[1]
  ])
  const destinationPointsMatrix = Matrix.columnVector([
    ...destinationPointsArrays[0],
    ...destinationPointsArrays[1]
  ])

  const pseudoInverseCoefsMatrix = pseudoInverse(coefsMatrix)

  const weightsMatrix = pseudoInverseCoefsMatrix.mmul(destinationPointsMatrix)

  const weightsArray = weightsMatrix.to1DArray()

  return weightsArray
}

/**
 * Solve the x and y components independently using PseudoInverse.
 *
 * This uses the 'Pseudo Inverse' to compute (for each component, using the same coefs for both)
 * a 'best fit' (least squares) approximate solution for the system of linear equations
 * which is (in general) over-defined and hence lacks an exact solution.
 *
 * See https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
 *
 * This wil result in a weights array for each component:
 * For order = 1: this.weight = [[a0_x, ax_x, ay_x], [a0_y, ax_y, ay_y]]
 * For order = 2: ... (similar, following the same order as in coefsArrayMatrix)
 * For order = 3: ... (similar, following the same order as in coefsArrayMatrix)
 */
export function solveIndependentlyPseudoInverse(
  coefsArrayMatrix: number[][],
  destinationPointsArrays: [number[], number[]]
): [number[], number[]] {
  const coefsMatrix = new Matrix(coefsArrayMatrix)
  const destinationPointsMatrices = [
    Matrix.columnVector(destinationPointsArrays[0]),
    Matrix.columnVector(destinationPointsArrays[1])
  ]

  const pseudoInverseCoefsMatrix = pseudoInverse(coefsMatrix)

  const weightsMatrices = [
    pseudoInverseCoefsMatrix.mmul(destinationPointsMatrices[0]),
    pseudoInverseCoefsMatrix.mmul(destinationPointsMatrices[1])
  ] as [Matrix, Matrix]

  const weightsArrays = weightsMatrices.map((matrix) => matrix.to1DArray()) as [
    number[],
    number[]
  ]

  return weightsArrays
}

/**
 * Solve the x and y components independently using exact inverse.
 *
 * This uses the exact inverse to compute (for each component, using the same coefs for both)
 * the exact solution for the system of linear equations
 * which is (in general) invertable to an exact solution.
 *
 * This wil result in a weights array for each component with rbf weights and affine weights.
 */
export function solveIndependentlyInverse(
  coefsArrayMatrix: number[][],
  destinationPointsArrays: [number[], number[]]
): [number[], number[]] {
  const coefsMatrix = new Matrix(coefsArrayMatrix)
  const destinationPointsMatrices = [
    Matrix.columnVector(destinationPointsArrays[0]),
    Matrix.columnVector(destinationPointsArrays[1])
  ]

  const inverseCoefsMatrix = inverse(coefsMatrix)

  const weightsMatrices = [
    inverseCoefsMatrix.mmul(destinationPointsMatrices[0]),
    inverseCoefsMatrix.mmul(destinationPointsMatrices[1])
  ] as [Matrix, Matrix]

  const weightsArrays = weightsMatrices.map((matrix) => matrix.to1DArray()) as [
    number[],
    number[]
  ]

  return weightsArrays
}

/**
 * Solve the x and y components jointly using singular value decomposition.
 *
 * This uses a singular value decomposition to compute the last (i.e. 9th) 'right singular vector',
 * i.e. the one with the smallest singular value, wich holds the weights for the solution.
 * Note that for a set of gcps that exactly follow a projective transformations,
 * the singular value is null and this vector spans the null-space.
 *
 * This wil result in a weights array for each component with rbf weights and affine weights.
 */
export function solveJointlySvd(
  coefsArrayMatrices: [number[][], number[][]],
  pointCount: number
): number[][] {
  // Joint coefs in the same order as in the paper
  // (Otherwise the weights may differ in sign, even though this should not affect the result)
  const coefsMatrix = []
  for (let i = 0; i < pointCount; i++) {
    coefsMatrix.push(coefsArrayMatrices[0][i])
    coefsMatrix.push(coefsArrayMatrices[1][i])
  }

  const svdCoefsMatrix = new SingularValueDecomposition(coefsMatrix)

  const weightsMatrix = Matrix.from1DArray(
    3,
    3,
    svdCoefsMatrix.rightSingularVectors.getColumn(8)
  ).transpose()
  const weightsArrays = weightsMatrix.to2DArray()

  return weightsArrays
}

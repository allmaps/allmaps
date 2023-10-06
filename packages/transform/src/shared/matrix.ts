import { Matrix } from 'ml-matrix'

// Elementwise product of two matrices, also called Hadamard product or Shur product
// This function is not provided as part of mlMatrix
// This is different from a classical matrix product availble in numeric as M1.mul(M2)
export function multiplyMatricesElementwise(M1: Matrix, M2: Matrix): Matrix {
  M1 = Matrix.checkMatrix(M1)
  M2 = Matrix.checkMatrix(M2)
  if (M1.rows != M2.rows || M1.columns != M2.columns)
    throw new Error('Matrices have different dimensions')
  const M = Matrix.zeros(M1.rows, M1.columns)
  for (let i = 0; i < M1.rows; i++) {
    for (let j = 0; j < M1.columns; j++) {
      M.set(i, j, M1.get(i, j) * M2.get(i, j))
    }
  }
  return M
}

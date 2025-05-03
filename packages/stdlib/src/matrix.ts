import { isEqualArray } from './main.js'

/**
 * Create and fill a ArrayMatrix: an Arrays of Arrays, that can later be loaded as a ml-matrix Matrix
 */
export function newArrayMatrix<T>(
  rows: number,
  cols: number,
  value?: T
): T[][] {
  if (rows <= 0 || cols <= 0) {
    throw new Error('Empty ArrayMatrix not supported')
  }
  return Array.from(Array(rows), (_) => Array(cols).fill(value)) as T[][]
}

export function arrayMatrixDimensions<T>(arrayMatrix: T[][]): [number, number] {
  if (arrayMatrix.length === 0) {
    throw new Error('ArrayMatrix may not be empty, but rows are empty')
  }
  const rowLengths = arrayMatrix.map((row) => row.length)
  if (rowLengths.some((rowLength) => rowLength === 0)) {
    throw new Error(
      'ArrayMatrix may not be empty, but at least one row is empty'
    )
  }
  if (!rowLengths.every((rowLength) => rowLength === rowLengths[0])) {
    throw new Error('Rows of unequal length')
  }
  const rows = arrayMatrix.length
  const cols = rowLengths[0]

  return [rows, cols]
}

export function subArrayMatrix<T>(
  arrayMatrix: T[][],
  rows: number[],
  cols: number[]
): T[][] {
  const dimensions = [rows.length, cols.length] as [number, number]
  const result = newArrayMatrix<T>(...dimensions)

  for (let i = 0; i < dimensions[0]; i++) {
    for (let j = 0; j < dimensions[1]; j++) {
      result[i][j] = arrayMatrix[rows[i]][cols[j]]
    }
  }
  return result
}

export function transposeArrayMatrix<T>(arrayMatrix: T[][]): T[][] {
  return arrayMatrix[0].map((_, colIndex) =>
    arrayMatrix.map((row) => row[colIndex])
  )
}

export function newBlockArrayMatrix<T>(blocks: T[][][][]): T[][] {
  const dimensions = arrayMatrixDimensions(blocks)
  const dimensionsArrayMatrix = blocks.map((row) =>
    row.map((block) => arrayMatrixDimensions(block))
  )

  const rowsArrayMatrix = dimensionsArrayMatrix.map((row) =>
    row.map((dims) => dims[0])
  )
  const transposedRowsArrayMatrix = transposeArrayMatrix(rowsArrayMatrix)
  const rowsArray = transposedRowsArrayMatrix[0]
  if (
    !transposedRowsArrayMatrix.every((array) =>
      isEqualArray(array, transposedRowsArrayMatrix[0])
    )
  ) {
    throw new Error(
      'The blocks, by block column, must have the same sequence of rows.'
    )
  }
  const rowsCumulativeArray: number[] = []
  let sum = 0
  rowsArray.forEach((e) => {
    sum = sum + e
    rowsCumulativeArray.push(sum)
  })

  const colsArrayMatrix = dimensionsArrayMatrix.map((row) =>
    row.map((dims) => dims[1])
  )
  const colsArray = colsArrayMatrix[0]
  if (!colsArrayMatrix.every((array) => isEqualArray(array, colsArray))) {
    throw new Error(
      'The blocks, by block row, must have the same sequence of columns.'
    )
  }
  const colsCumulativeArray: number[] = []
  sum = 0
  colsArrayMatrix[0].forEach((e) => {
    sum = sum + e
    colsCumulativeArray.push(sum)
  })

  const result = newArrayMatrix<T>(
    rowsCumulativeArray.at(-1) as number,
    colsCumulativeArray.at(-1) as number
  )

  for (let i = 0; i < dimensions[0]; i++) {
    for (let j = 0; j < dimensions[1]; j++) {
      for (let k = 0; k < dimensionsArrayMatrix[i][j][0]; k++) {
        for (let l = 0; l < dimensionsArrayMatrix[i][j][1]; l++) {
          result[(i >= 1 ? rowsCumulativeArray[i - 1] : 0) + k][
            (j >= 1 ? colsCumulativeArray[j - 1] : 0) + l
          ] = blocks[i][j][k][l]
        }
      }
    }
  }

  return result
}

import { isEqualArray } from './main.js'

/**
 * Create and fill a ArrayMatrix: an Arrays of Arrays, that can later be loaded as a ml-matrix Matrix
 */
export function newArrayMatrix<T = number>(
  rows: number,
  cols: number,
  value: T = 0 as T
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

export function shallowCopyArrayMatrix<T>(arrayMatrix: T[][]): T[][] {
  return arrayMatrix.map((row) => [...row])
}

// Slice specific rows and columns of an arrayMatrix.
// Just like slice, this returns a copy!
export function sliceArrayMatrix<T>(
  arrayMatrix: T[][],
  rowsStart: number,
  colsStart: number,
  rowsEnd?: number,
  colsEnd?: number
): T[][] {
  return arrayMatrix
    .slice(rowsStart, rowsEnd)
    .map((row) => row.slice(colsStart, colsEnd))
}

// Get a submatrix at specified rows and columns.
// This is more flexible the the range, like in sliceArrayMatrix.
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

// Pointwise multiplication. For Matrix multiplication, see ml-matrix
export function multiplyArrayMatrix(
  arrayMatrix: number[][],
  factor: number
): number[][] {
  const dimensions = arrayMatrixDimensions(arrayMatrix)
  const result = newArrayMatrix<number>(...dimensions)

  for (let i = 0; i < dimensions[0]; i++) {
    for (let j = 0; j < dimensions[1]; j++) {
      result[i][j] = factor * arrayMatrix[i][j]
    }
  }
  return result
}

// Pastes a arrayMatrix inside an arrayMatrix at a specific location.
// Returns a copy with the pasted subArray.
export function pasteArrayMatrix<T>(
  arrayMatrix: T[][],
  rowsStart: number,
  colsStart: number,
  subArrayMatrix: T[][]
): T[][] {
  const subDimensions = arrayMatrixDimensions(subArrayMatrix)
  const result = shallowCopyArrayMatrix(arrayMatrix)

  for (let i = 0; i < subDimensions[0]; i++) {
    for (let j = 0; j < subDimensions[1]; j++) {
      result[rowsStart + i][colsStart + j] = subArrayMatrix[i][j]
    }
  }

  return result
}

export function transposeArrayMatrix<T>(arrayMatrix: T[][]): T[][] {
  return arrayMatrix[0].map((_, colIndex) =>
    arrayMatrix.map((row) => row[colIndex])
  )
}

export function newBlockArrayMatrix<T = number>(
  blocks: T[][][][],
  emptyValue: T = 0 as T
): T[][] {
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
  const rowsTrailingCumulativeArray: number[] = []
  let sum = 0
  rowsArray.forEach((e) => {
    rowsTrailingCumulativeArray.push(sum)
    sum = sum + e
  })
  const rowsCumulative = sum

  const colsArrayMatrix = dimensionsArrayMatrix.map((row) =>
    row.map((dims) => dims[1])
  )
  const colsArray = colsArrayMatrix[0]
  if (!colsArrayMatrix.every((array) => isEqualArray(array, colsArray))) {
    throw new Error(
      'The blocks, by block row, must have the same sequence of columns.'
    )
  }
  const colsTrailingCumulativeArray: number[] = []
  sum = 0
  colsArrayMatrix[0].forEach((e) => {
    colsTrailingCumulativeArray.push(sum)
    sum = sum + e
  })
  const colsCumulative = sum

  let result = newArrayMatrix<T>(rowsCumulative, colsCumulative, emptyValue)

  for (let i = 0; i < dimensions[0]; i++) {
    for (let j = 0; j < dimensions[1]; j++) {
      result = pasteArrayMatrix(
        result,
        rowsTrailingCumulativeArray[i],
        rowsTrailingCumulativeArray[j],
        blocks[i][j]
      )
    }
  }

  return result
}

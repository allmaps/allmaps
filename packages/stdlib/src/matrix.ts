import { isEqualArray } from './main.js'

import type { Size } from '@allmaps/types'

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
  const result = new Array(rows)
  for (let i = 0; i < rows; i++) {
    const row = new Array(cols)
    for (let j = 0; j < cols; j++) {
      row[j] = value
    }
    result[i] = row
  }
  return result
}

export function arrayMatrixSize<T>(arrayMatrix: T[][]): Size {
  return [arrayMatrix.length, arrayMatrix[0].length]
}

export function arrayMatrixSizeSafer<T>(arrayMatrix: T[][]): Size {
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
  const rows = arrayMatrix.length
  const result = new Array(rows)

  for (let i = 0; i < rows; i++) {
    result[i] = arrayMatrix[i].slice()
  }

  return result
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
  const size = [rows.length, cols.length] as Size
  const result = newArrayMatrix<T>(...size)

  for (let i = 0; i < size[0]; i++) {
    for (let j = 0; j < size[1]; j++) {
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
  const size = arrayMatrixSize(arrayMatrix)
  const result = newArrayMatrix<number>(...size)

  for (let i = 0; i < size[0]; i++) {
    for (let j = 0; j < size[1]; j++) {
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
  const subSize = arrayMatrixSize(subArrayMatrix)
  const result = shallowCopyArrayMatrix(arrayMatrix)

  for (let i = 0; i < subSize[0]; i++) {
    for (let j = 0; j < subSize[1]; j++) {
      result[rowsStart + i][colsStart + j] = subArrayMatrix[i][j]
    }
  }

  return result
}

export function transposeArrayMatrix<T>(arrayMatrix: T[][]): T[][] {
  const rows = arrayMatrix.length
  const cols = arrayMatrix[0].length
  const result = new Array(cols)

  for (let j = 0; j < cols; j++) {
    const newRow = new Array(rows)
    for (let i = 0; i < rows; i++) {
      newRow[i] = arrayMatrix[i][j]
    }
    result[j] = newRow
  }

  return result
}

export function newBlockArrayMatrix<T = number>(
  blocks: T[][][][],
  emptyValue: T = 0 as T
): T[][] {
  const size = arrayMatrixSize(blocks)
  const sizesArrayMatrix = blocks.map((row) =>
    row.map((block) => arrayMatrixSize(block))
  )

  const rowsArrayMatrix = sizesArrayMatrix.map((row) =>
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

  const colsArrayMatrix = sizesArrayMatrix.map((row) =>
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

  for (let i = 0; i < size[0]; i++) {
    for (let j = 0; j < size[1]; j++) {
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

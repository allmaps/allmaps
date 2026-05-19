import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [
  ,
  ,
  sourceFile,
  targetFile,
  startDelimiter = '// START_AUTOMATED_COPY',
  endDelimiter = '// END_AUTOMATED_COPY'
] = process.argv

if (!sourceFile || !targetFile) {
  console.error(
    'Usage: node extract.ts <source> <target> [startDelimiter] [endDelimiter]'
  )
  process.exit(1)
}

function findDelimiterLines(
  lines: string[],
  start: string,
  end: string
): [number, number] | null {
  const startIndex = lines.findIndex((line) => line.includes(start))
  const endIndex = lines.findIndex((line) => line.includes(end))
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex)
    return null
  return [startIndex, endIndex]
}

try {
  const sourceLines = readFileSync(resolve(sourceFile), 'utf8').split('\n')
  const targetLines = readFileSync(resolve(targetFile), 'utf8').split('\n')

  const srcRange = findDelimiterLines(sourceLines, startDelimiter, endDelimiter)
  if (!srcRange) {
    console.error('Error: Could not find matching delimiters in source file.')
    process.exit(1)
  }

  const tgtRange = findDelimiterLines(targetLines, startDelimiter, endDelimiter)
  if (!tgtRange) {
    console.error('Error: Could not find matching delimiters in target file.')
    process.exit(1)
  }

  const extracted = sourceLines.slice(srcRange[0] + 1, srcRange[1])

  const result = [
    ...targetLines.slice(0, tgtRange[0] + 1),
    ...extracted,
    ...targetLines.slice(tgtRange[1])
  ].join('\n')

  writeFileSync(resolve(targetFile), result, 'utf8')
} catch (err) {
  console.error('File processing failed:', (err as Error).message)
  process.exit(1)
}

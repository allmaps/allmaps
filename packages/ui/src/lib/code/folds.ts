import type { CodeFold, CodeSection } from './types.js'

/** Split source into non-overlapping sections; ignore invalid fold ranges. */
export function getCodeSections(
  code: string,
  folds: CodeFold[] = []
): CodeSection[] {
  const lines = code.split(/\r?\n/)
  const sections: CodeSection[] = []
  let nextLine = 1
  function append(startLine: number, endLine: number, fold?: CodeFold) {
    sections.push({
      startLine,
      endLine,
      code: lines.slice(startLine - 1, endLine).join('\n'),
      fold
    })
  }
  for (const fold of [...folds].sort((a, b) => a.startLine - b.startLine)) {
    if (
      !Number.isInteger(fold.startLine) ||
      !Number.isInteger(fold.endLine) ||
      fold.startLine < nextLine ||
      fold.endLine < fold.startLine ||
      fold.endLine > lines.length
    )
      continue
    if (fold.startLine > nextLine) append(nextLine, fold.startLine - 1)
    append(fold.startLine, fold.endLine, fold)
    nextLine = fold.endLine + 1
  }
  if (nextLine <= lines.length) append(nextLine, lines.length)
  return sections
}

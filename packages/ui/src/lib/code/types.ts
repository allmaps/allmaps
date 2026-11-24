import type { ThemeRegistration } from 'shiki'
import type { Snippet } from 'svelte'

export type CodeLanguage =
  'javascript' | 'typescript' | 'html' | 'bash' | 'svelte' | 'json'

export type CodeColorMode = 'auto' | 'system' | 'light' | 'dark'

/** One-based line or inclusive range, as used by the docs' annotation examples. */
export type CodeMark = {
  range: string
  label?: string
}

export type CodeFold = {
  /** One-based, inclusive line numbers. Ranges must not overlap. */
  startLine: number
  endLine: number
  label: string
  collapsed?: boolean
}

export type CodeSection = {
  code: string
  startLine: number
  endLine: number
  fold?: CodeFold
}

/** Shiki themes, optionally accompanied by the host site's frame styles. */
export type CodeThemeConfig = {
  themes: ThemeRegistration[]
  styles?: Record<`--allmaps-code-${string}`, string>
}

export type CodeBlockProps = {
  code: string
  language: CodeLanguage
  title?: string
  titleContent?: Snippet
  headerActions?: Snippet
  downloadFilename?: string
  ondownload?: () => void
  colorMode?: CodeColorMode
  wrap?: boolean
  mark?: CodeMark[]
  folds?: CodeFold[]
  theme?: CodeThemeConfig
  /** Highlighted source for the initial server render. */
  initial?: RenderedCodeBlock
}

export type RenderedCodeBlock = {
  code: string
  language: CodeLanguage
  html: string
  /** Identifies custom syntax themes used by the highlighter. */
  themeKey?: string
  mark?: CodeMark[]
  folds?: CodeFold[]
  sections?: (CodeSection & { html: string })[]
}

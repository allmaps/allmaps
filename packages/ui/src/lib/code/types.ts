import type { ThemeRegistration } from 'shiki'

export type CodeLanguage = 'javascript' | 'html' | 'bash'

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
  wrap?: boolean
  folds?: CodeFold[]
  theme?: CodeThemeConfig
  /** Highlighted source for the initial server render. */
  initial?: RenderedCodeBlock
}

export type RenderedCodeBlock = {
  code: string
  language: CodeLanguage
  html: string
  folds?: CodeFold[]
  sections?: (CodeSection & { html: string })[]
}

import { getCodeSections } from './folds.ts'
import type { HighlighterCore } from 'shiki/core'
import type { CodeBlockProps, CodeThemeConfig } from './types.js'

let highlighterPromise: Promise<HighlighterCore> | undefined
let nextThemeId = 0
const loadedThemes = new Map<
  string,
  Promise<Record<'light' | 'dark', string>>
>()

function highlighter() {
  highlighterPromise ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/html.mjs'),
    import('shiki/langs/bash.mjs')
  ]).then(
    ([
      { createHighlighterCore },
      { createJavaScriptRegexEngine },
      ...languages
    ]) =>
      createHighlighterCore({
        langs: languages.map((language) => language.default),
        themes: [],
        engine: createJavaScriptRegexEngine()
      })
  )
  return highlighterPromise
}

async function themes(syntax: HighlighterCore, config?: CodeThemeConfig) {
  const key = JSON.stringify(config?.themes ?? [])
  let loaded = loadedThemes.get(key)
  if (!loaded) {
    const prefix = `allmaps-${nextThemeId++}`
    loaded = (async () => {
      const definitions =
        config?.themes ??
        (await Promise.all([
          import('shiki/themes/github-light.mjs').then(
            ({ default: theme }) => theme
          ),
          import('shiki/themes/github-dark.mjs').then(
            ({ default: theme }) => theme
          )
        ]))
      const light =
        definitions.find((theme) => theme.type === 'light') ?? definitions[0]
      const dark =
        definitions.find((theme) => theme.type === 'dark') ?? definitions[0]
      if (!light || !dark)
        throw new Error('At least one code theme is required.')
      const names = { light: `${prefix}-light`, dark: `${prefix}-dark` }
      await syntax.loadTheme(
        { ...light, name: names.light },
        { ...dark, name: names.dark }
      )
      return names
    })()
    loadedThemes.set(key, loaded)
    void loaded.catch(() => loadedThemes.delete(key))
  }
  return loaded
}

/** Highlight source only; the Svelte component owns the frame and copy button. */
export async function renderCode({
  code,
  language,
  theme,
  folds = []
}: CodeBlockProps) {
  const syntax = await highlighter()
  const { hastToHtml } = await import('shiki/core')
  // Highlight the complete source first so folds preserve multiline grammar state.
  const tree = syntax.codeToHast(code, {
    lang: language,
    themes: await themes(syntax, theme),
    defaultColor: false,
    transformers: [
      {
        pre(node) {
          node.properties.class = 'shiki'
        }
      }
    ]
  })
  const pre = tree.children.find(
    (node) => node.type === 'element' && node.tagName === 'pre'
  )
  const codeNode =
    pre?.type === 'element'
      ? pre.children.find(
          (node) => node.type === 'element' && node.tagName === 'code'
        )
      : undefined
  const sections =
    folds.length && pre?.type === 'element' && codeNode?.type === 'element'
      ? getCodeSections(code, folds).map((section) => {
          // Shiki separates its line elements with newline text nodes.
          const lines = codeNode.children.filter(
            (node) => node.type === 'element'
          )
          const selectedLines = lines.slice(
            section.startLine - 1,
            section.endLine
          )
          const children = selectedLines.flatMap((line, index) =>
            index ? [{ type: 'text' as const, value: '\n' }, line] : [line]
          )
          return {
            ...section,
            html: hastToHtml({ ...pre, children: [{ ...codeNode, children }] })
          }
        })
      : undefined
  return { code, language, html: hastToHtml(tree), folds, sections }
}

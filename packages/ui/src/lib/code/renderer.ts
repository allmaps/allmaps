import { getCodeSections } from './folds.ts'
import { generateId } from '@allmaps/id/sync'
import type { HighlighterCore } from 'shiki/core'
import type { CodeBlockProps, CodeThemeConfig } from './types.js'

let highlighterPromise: Promise<HighlighterCore> | undefined
let nextThemeId = 0
const loadedThemes = new Map<
  string | undefined,
  Promise<Record<'light' | 'dark', string>>
>()

function highlighter() {
  highlighterPromise ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/html.mjs'),
    import('shiki/langs/css.mjs'),
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

async function themes(syntax: HighlighterCore, serializedThemes?: string) {
  let loaded = loadedThemes.get(serializedThemes)
  if (!loaded) {
    const prefix = `allmaps-${nextThemeId++}`
    loaded = (async () => {
      // Shiki normalizes settings in place. Give it its own copy of custom themes.
      const definitions: CodeThemeConfig['themes'] = serializedThemes
        ? JSON.parse(serializedThemes)
        : await Promise.all([
            import('shiki/themes/github-light.mjs').then(
              ({ default: theme }) => theme
            ),
            import('shiki/themes/github-dark.mjs').then(
              ({ default: theme }) => theme
            )
          ])
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
    loadedThemes.set(serializedThemes, loaded)
    void loaded.catch(() => loadedThemes.delete(serializedThemes))
  }
  return loaded
}

/** Highlight source only; the Svelte component owns the frame and copy button. */
export async function renderCode({
  code,
  language,
  theme,
  mark = [],
  folds = []
}: CodeBlockProps) {
  const syntax = await highlighter()
  if (
    language === 'svelte' &&
    !syntax.getLoadedLanguages().includes('svelte')
  ) {
    await syntax.loadLanguage(import('shiki/langs/svelte.mjs'))
  }
  if (
    language === 'typescript' &&
    !syntax.getLoadedLanguages().includes('typescript')
  ) {
    await syntax.loadLanguage(import('shiki/langs/typescript.mjs'))
  }
  if (language === 'json' && !syntax.getLoadedLanguages().includes('json')) {
    await syntax.loadLanguage(import('shiki/langs/json.mjs'))
  }
  const markedLines = new Map<number, string | undefined>()
  if (mark.length) {
    const count = code.split('\n').length
    for (const { range, label } of mark) {
      const match = /^(\d+)(?:-(\d+))?$/.exec(range)
      if (!match) continue
      const start = Number(match[1])
      const end = Number(match[2] ?? start)
      if (start < 1 || end < start || end > count) continue
      for (let line = start; line <= end; line++) {
        markedLines.set(line, line === start ? label : markedLines.get(line))
      }
    }
  }
  const { hastToHtml } = await import('shiki/core')
  // Highlight the complete source first so folds preserve multiline grammar state.
  const serializedThemes = JSON.stringify(theme?.themes)
  const tree = syntax.codeToHast(code, {
    lang: language,
    tabindex: false,
    themes: await themes(syntax, serializedThemes),
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          if (!markedLines.has(line)) return
          node.properties['data-code-mark'] = ''
          const label = markedLines.get(line)
          if (label)
            node.children.unshift({
              type: 'element',
              tagName: 'span',
              properties: { 'data-code-label': '' },
              children: [{ type: 'text', value: label }]
            })
        },
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
  return {
    code,
    language,
    html: hastToHtml(tree),
    themeKey: serializedThemes && generateId(serializedThemes),
    mark,
    folds,
    sections
  }
}

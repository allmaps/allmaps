import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

import nord from 'shiki/themes/nord.mjs'

import type { HighlighterCore } from 'shiki/core'

type Lang = 'json' | 'javascript' | 'bash'

let highlighter: HighlighterCore | undefined

async function initialize() {
  highlighter = await createHighlighterCore({
    themes: [nord],
    langs: [
      import('shiki/langs/json.mjs'),
      import('shiki/langs/javascript.mjs'),
      import('shiki/langs/bash.mjs')
    ],
    engine: createOnigurumaEngine(import('shiki/wasm'))
  })
}

export function highlight(value: string, lang: Lang) {
  if (highlighter) {
    return highlighter.codeToHtml(value, {
      lang,
      theme: 'nord'
    })
  }

  return ''
}

initialize()

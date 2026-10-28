import assert from 'node:assert/strict'
import test from 'node:test'
import { selectAll, toText } from '@astrojs/starlight/expressive-code/hast'
import { liveCodeTheme } from '../src/plugins/live-code-theme.mjs'
import { renderCode } from '../../../packages/ui/dist/code/renderer.js'

function styles(value) {
  return Object.fromEntries(
    value
      .split(';')
      .filter(Boolean)
      .map((declaration) => {
        const colon = declaration.indexOf(':')
        return [declaration.slice(0, colon), declaration.slice(colon + 1)]
      })
  )
}

function characters(text, style, prefix, suffixes) {
  return [...text].map((character) => ({
    character,
    light: appearance('light'),
    dark: appearance('dark')
  }))
  function appearance(mode) {
    const key = prefix[mode]
    return [
      style[key],
      style[key + suffixes[0]] ?? 'normal',
      style[key + suffixes[1]] ?? '400',
      style[key + suffixes[2]] ?? 'none'
    ]
  }
}

function decode(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'"
  }
  return text.replace(/&(?:amp|lt|gt|quot|#\d+|#x[\da-f]+);/gi, (entity) => {
    if (entity.startsWith('&#')) {
      const hex = entity[2].toLowerCase() === 'x'
      return String.fromCodePoint(
        parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10)
      )
    }
    return entities[entity]
  })
}

test('dynamic Shiki highlighting matches static Expressive Code in both themes', async () => {
  const plugin = liveCodeTheme(new URL('../', import.meta.url))
  // EC imports its config separately, using a cache-busting URL.
  const { default: config } = await import('../ec.config.mjs?t=theme-test')
  const reference = await config.customCreateRenderer({
    themes: ['github-dark', 'github-light'],
    shiki: { engine: 'javascript', langs: ['javascript', 'html', 'bash'] },
    styleOverrides: {
      codeFontFamily: 'var(--__sl-font-mono)',
      borderRadius: '0px',
      frames: { frameBoxShadowCssValue: 'none' }
    }
  })
  const themeModule = plugin.load(
    plugin.resolveId('virtual:allmaps-code-theme')
  )
  const theme = JSON.parse(themeModule.replace('export default ', ''))
  assert.equal(theme.styles['--allmaps-code-font'], 'var(--__sl-font-mono)')
  assert.equal(theme.styles['--allmaps-code-border-radius'], '0px')
  assert.equal(theme.styles['--allmaps-code-shadow'], 'none')
  assert.ok(
    Object.values(theme.styles).every(
      (value) => value && !value.includes('undefined')
    )
  )
  const examples = {
    javascript:
      '// A comment\nconst value = "Saïgon"\nwarpedMapLayer.setOpacity(0.5)',
    html: '<div id="map" style="height: 400px">Map &amp; image</div>',
    bash: 'pnpm add maplibre-gl @allmaps/maplibre'
  }
  for (const [language, code] of Object.entries(examples)) {
    const expected = await reference.ec.render({
      code,
      language,
      props: { wrap: true }
    })
    const actual = await renderCode({ code, language, theme })
    const staticCharacters = selectAll(
      '.ec-line .code span[style]',
      expected.renderedGroupAst
    ).flatMap((span) =>
      characters(
        toText(span),
        styles(span.properties.style),
        { dark: '--0', light: '--1' },
        ['fs', 'fw', 'td']
      )
    )
    const dynamicCharacters = [
      ...actual.html.matchAll(/<span style="([^"]*)">([^<]*)<\/span>/g)
    ].flatMap(([, style, text]) =>
      characters(
        decode(text),
        styles(style),
        { dark: '--shiki-dark', light: '--shiki-light' },
        ['-font-style', '-font-weight', '-text-decoration']
      )
    )
    // Shiki merges adjacent whitespace into tokens; EC colors spaces separately.
    assert.deepEqual(
      dynamicCharacters.filter(({ character }) => character.trim()),
      staticCharacters.filter(({ character }) => character.trim()),
      language
    )
  }
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { svelteLoader } from './helpers/svelte-loader.ts'
import { render } from 'svelte/server'
import { renderCode } from '../src/lib/code/renderer.ts'
import { getCodeSections } from '../src/lib/code/folds.ts'
import type { CodeLanguage, CodeThemeConfig } from '../src/lib/code/types.js'

const languages: CodeLanguage[] = [
  'javascript',
  'typescript',
  'html',
  'bash',
  'svelte',
  'json'
]

const { default: CodeBlock } =
  await import('../src/lib/components/CodeBlock.svelte')
svelteLoader.deregister()

test('Shiki escapes source markup in every supported language', async () => {
  const code = '<img src="missing" onerror="alert(1)">'
  for (const language of languages) {
    const { html } = await renderCode({ code, language })
    assert.ok(!html.includes('<img'))
    assert.match(html, /&(?:lt|#x3c|#60);/i)
    assert.match(html, /class="shiki"/)
    assert.match(html, /--shiki-light:/)
    assert.match(html, /--shiki-dark:/)
    assert.ok(!html.includes('expressive-code'))
  }
})

test('custom themes stay isolated even when their names are identical', async () => {
  function theme(light: string, dark: string): CodeThemeConfig {
    return {
      themes: [
        {
          name: 'shared-light',
          type: 'light',
          settings: [{ scope: 'keyword', settings: { foreground: light } }]
        },
        {
          name: 'shared-dark',
          type: 'dark',
          settings: [{ scope: 'keyword', settings: { foreground: dark } }]
        }
      ]
    }
  }
  const code = 'const value = 1'
  const original = theme('#112233', '#aabbcc')
  const before = structuredClone(original)
  const [first, second, repeated] = await Promise.all([
    renderCode({
      code,
      language: 'javascript',
      theme: original
    }),
    renderCode({
      code,
      language: 'javascript',
      theme: theme('#445566', '#ddeeff')
    }),
    renderCode({
      code,
      language: 'javascript',
      theme: theme('#112233', '#aabbcc')
    })
  ])
  assert.match(first.html, /--shiki-light:#112233;--shiki-dark:#AABBCC/i)
  assert.match(second.html, /--shiki-light:#445566;--shiki-dark:#DDEEFF/i)
  assert.match(first.themeKey ?? '', /^[0-9a-f]{16}$/)
  assert.equal(first.themeKey, repeated.themeKey)
  assert.notEqual(first.themeKey, second.themeKey)
  assert.equal(first.html, repeated.html)

  assert.deepEqual(original, before)
  const renderInitial = (config: CodeThemeConfig, initial = first) =>
    render(CodeBlock, {
      props: { code, language: 'javascript', theme: config, initial }
    }).body

  assert.match(renderInitial(original), /class="shiki"/)
  assert.match(
    renderInitial({
      ...original,
      styles: { '--allmaps-code-font': 'monospace' }
    }),
    /class="shiki"/
  )
  assert.match(
    renderInitial(original, {
      ...first,
      themeKey: JSON.stringify(original.themes)
    }),
    /class="shiki"/
  )
  assert.doesNotMatch(
    renderInitial(theme('#445566', '#ddeeff')),
    /class="shiki"/
  )
})

test('source updates preserve the exact original text', async () => {
  for (const opacity of [0.25, 0.5, 0.75]) {
    const code = `warpedMapLayer.setOpacity(${opacity})\n// <&> Unicode: Saïgon 🗺`
    const rendered = await renderCode({ code, language: 'javascript' })
    assert.equal(rendered.code, code)
    assert.ok(rendered.html.includes(String(opacity)))
  }
})

test('the server render includes highlighted source and an accessible copy control', async () => {
  const code = 'warpedMapLayer.setOpacity(0.5)'
  const initial = await renderCode({ code, language: 'javascript' })
  const page = render(CodeBlock, {
    props: { code, language: 'javascript', initial, title: 'example.js' }
  }).body
  assert.match(page, /class="shiki"/)
  assert.match(page, /aria-label="Copy to clipboard"/)
  assert.match(
    page,
    /<div(?=[^>]*role="tooltip")(?=[^>]*\shidden(?:[\s=>]))[^>]*>/
  )
  assert.match(page, /example.js/)
  assert.match(page, /wrapped/)
  assert.ok(!page.includes('expressive-code'))
  assert.ok(!page.includes('<style'))
})

test('stale initial highlighting never replaces changed source', async () => {
  const initial = await renderCode({
    code: 'oldSource()',
    language: 'javascript'
  })
  const page = render(CodeBlock, {
    props: { code: 'newSource()', language: 'javascript', initial, wrap: false }
  }).body
  assert.ok(page.includes('newSource()'))
  assert.ok(!page.includes('oldSource()'))
  assert.ok(!page.includes('data-wrapped="true"'))
})

test('install commands retain a terminal frame', async () => {
  const code = 'pnpm add maplibre-gl @allmaps/maplibre'
  const initial = await renderCode({ code, language: 'bash' })
  const page = render(CodeBlock, {
    props: { code, language: 'bash', initial }
  }).body
  assert.match(page, /data-terminal="true"/)
  assert.match(page, /class="shiki"/)
})

test('fold ranges preserve all lines and ignore invalid or overlapping ranges', () => {
  const code = 'one\ntwo\nthree\nfour\nfive\n'
  const sections = getCodeSections(code, [
    { startLine: 4, endLine: 5, label: 'Second' },
    { startLine: 0, endLine: 1, label: 'Invalid' },
    { startLine: 1, endLine: 2, label: 'First' },
    { startLine: 2, endLine: 3, label: 'Overlap' }
  ])
  assert.equal(sections.map((section) => section.code).join('\n'), code)
  assert.deepEqual(
    sections
      .filter((section) => section.fold)
      .map((section) => section.fold?.label),
    ['First', 'Second']
  )
})

test('folding preserves highlighting across multiline syntax and the full source', async () => {
  const code = 'const text = `first\n<img>\nlast`\nconsole.log(text)'
  const result = await renderCode({
    code,
    language: 'javascript',
    folds: [{ startLine: 1, endLine: 1, label: 'Start' }]
  })
  assert.equal(result.code, code)
  assert.equal(result.sections?.map((section) => section.code).join('\n'), code)
  const wholeLines = result.html.match(
    /<span class="line">.*?<\/span>(?=\n|<\/code>)/g
  )
  const sectionLines = result.sections?.flatMap(
    (section) =>
      section.html.match(/<span class="line">.*?<\/span>(?=\n|<\/code>)/g) ?? []
  )
  assert.deepEqual(sectionLines, wholeLines)
  assert.ok(!result.sections?.[1].html.includes('<img>'))
})

test('folds render as native disclosures, collapsed by default', async () => {
  for (const collapsed of [true, false]) {
    const code = '# Setup\ngdal_translate source.jpg output.tif'
    const folds = [
      { startLine: 1, endLine: 1, label: 'Setup checks', collapsed }
    ]
    const initial = await renderCode({ code, language: 'bash', folds })
    const page = render(CodeBlock, {
      props: { code, language: 'bash', folds, initial }
    }).body
    assert.match(page, /<summary[^>]*>[\s\S]*\/\/ Setup checks/)
    assert.equal(/<details[^>]*\sopen(?:="")?(?:\s|>)/.test(page), !collapsed)
    assert.match(page, /<\/details>[\s\S]*gdal_translate/)
    assert.equal(initial.code, code)
  }
})

test('labeled ranges preserve source and stay with their lines inside folds', async () => {
  const code = '{\n  "type": "ImageService3"\n}'
  const mark = [
    { range: '2-3', label: 'Source <image>' },
    { range: '0-9', label: 'invalid' }
  ]
  const folds = [{ startLine: 1, endLine: 2, label: 'Resource' }]
  const result = await renderCode({ code, language: 'json', mark, folds })
  assert.equal(result.code, code)
  assert.equal(result.html.match(/data-code-mark/g)?.length, 2)
  assert.equal(result.html.match(/data-code-label/g)?.length, 1)
  assert.doesNotMatch(result.html, /<image>|invalid/)
  assert.ok(result.sections)
  assert.match(result.sections[0].html, /data-code-label/)
  assert.doesNotMatch(result.sections[1].html, /data-code-label/)
})

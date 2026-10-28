import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import { renderCode } from '../src/lib/code/renderer.ts'
import { getCodeSections } from '../src/lib/code/folds.ts'
import type { CodeLanguage, CodeThemeConfig } from '../src/lib/code/types.js'

const languages: CodeLanguage[] = ['javascript', 'html', 'bash']

async function component() {
  const source = await readFile(
    new URL('../src/lib/components/CodeBlock.svelte', import.meta.url),
    'utf8'
  )
  const compiled = compile(source, {
    generate: 'server',
    filename: 'CodeBlock.svelte'
  })
  const javascript = compiled.js.code
    .replace(
      /'(svelte(?:\/[^']*)?)'/g,
      (_, specifier) => `'${import.meta.resolve(specifier)}'`
    )
    .replace(
      "'../code/folds.js'",
      `'${import.meta.resolve('../src/lib/code/folds.ts')}'`
    )
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
    )
  ).default
}

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
  const [first, second, repeated] = await Promise.all([
    renderCode({
      code,
      language: 'javascript',
      theme: theme('#112233', '#aabbcc')
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
  assert.equal(first.html, repeated.html)
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
  const CodeBlock = await component()
  const code = 'warpedMapLayer.setOpacity(0.5)'
  const initial = await renderCode({ code, language: 'javascript' })
  const page = render(CodeBlock, {
    props: { code, language: 'javascript', initial, title: 'example.js' }
  }).body
  assert.match(page, /class="shiki"/)
  assert.match(page, /aria-label="Copy to clipboard"/)
  assert.match(page, /example.js/)
  assert.match(page, /wrapped/)
  assert.ok(!page.includes('expressive-code'))
  assert.ok(!page.includes('<style'))
})

test('stale initial highlighting never replaces changed source', async () => {
  const CodeBlock = await component()
  const initial = await renderCode({
    code: 'oldSource()',
    language: 'javascript'
  })
  const page = render(CodeBlock, {
    props: { code: 'newSource()', language: 'javascript', initial, wrap: false }
  }).body
  assert.ok(page.includes('newSource()'))
  assert.ok(!page.includes('oldSource()'))
  assert.ok(!page.includes('wrapped'))
})

test('install commands retain a terminal frame', async () => {
  const CodeBlock = await component()
  const code = 'pnpm add maplibre-gl @allmaps/maplibre'
  const initial = await renderCode({ code, language: 'bash' })
  const page = render(CodeBlock, {
    props: { code, language: 'bash', initial }
  }).body
  assert.match(page, /terminal-dots/)
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
  const CodeBlock = await component()
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

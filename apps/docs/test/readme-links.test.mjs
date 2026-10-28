import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import { rewriteReadmeLinks } from '../scripts/readme-links.ts'

const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'allmaps-readme-links-'))
after(() => rmSync(repositoryRoot, { recursive: true, force: true }))
for (const directory of [
  'packages/source',
  'packages/omitted',
  'apps/viewer'
]) {
  mkdirSync(path.join(repositoryRoot, directory), { recursive: true })
}
writeFileSync(path.join(repositoryRoot, 'packages/source/LICENSE'), 'MIT')

const options = {
  repositoryRoot,
  readmePath: path.join(repositoryRoot, 'packages/source/README.md'),
  packageNames: new Set(['source', 'render'])
}
const markdown = remark().use(remarkGfm)

function nodes(source, type) {
  const matches = []
  function visit(node) {
    if (node.type === type) matches.push(node)
    node.children?.forEach(visit)
  }
  visit(markdown.parse(source))
  return matches
}

test('maps only published package directories and READMEs to docs routes', () => {
  const output = rewriteReadmeLinks(
    '[Package](../render/) [Readme](../render/README.md?plain=1#usage) ' +
      '[Self](README.md#usage) [Omitted](../omitted/) ' +
      '[File](../render/src/index.ts)',
    options
  )
  assert.deepEqual(
    nodes(output, 'link').map(({ url }) => url),
    [
      '/packages/render',
      '/packages/render?plain=1#usage',
      '/packages/source#usage',
      'https://github.com/allmaps/allmaps/tree/develop/packages/omitted/',
      'https://github.com/allmaps/allmaps/blob/develop/packages/render/src/index.ts'
    ]
  )
})

test('resolves repository files and directories, including extensionless paths', () => {
  const output = rewriteReadmeLinks(
    '[App](../../apps/viewer) [Example](./examples/map.json?raw=1#map) ' +
      '[License](LICENSE) [Spaces](<./examples/my map.json>)',
    options
  )
  assert.deepEqual(
    nodes(output, 'link').map(({ url }) => url),
    [
      'https://github.com/allmaps/allmaps/tree/develop/apps/viewer',
      'https://github.com/allmaps/allmaps/blob/develop/packages/source/examples/map.json?raw=1#map',
      'https://github.com/allmaps/allmaps/blob/develop/packages/source/LICENSE',
      'https://github.com/allmaps/allmaps/blob/develop/packages/source/examples/my%20map.json'
    ]
  )
})

test('rewrites image URLs and reference definitions while preserving titles', () => {
  const output = rewriteReadmeLinks(
    '![Example](./image.jpg "Map")\n\n[Read more][package]\n\n' +
      '![Reference image][picture]\n\n' +
      '[package]: ../render/README.md#usage "Render"\n' +
      '[picture]: ./other.png?size=2#image "Other map"\n',
    options
  )
  assert.equal(
    nodes(output, 'image')[0].url,
    'https://raw.githubusercontent.com/allmaps/allmaps/develop/packages/source/image.jpg'
  )
  assert.equal(nodes(output, 'image')[0].title, 'Map')
  assert.deepEqual(
    nodes(output, 'definition').map(({ url, title }) => [url, title]),
    [
      ['/packages/render#usage', 'Render'],
      [
        'https://raw.githubusercontent.com/allmaps/allmaps/develop/packages/source/other.png?size=2#image',
        'Other map'
      ]
    ]
  )
})

test('preserves code examples and leaves absolute URLs and anchors alone', () => {
  const source = [
    '[Website](https://example.org/a?b=1#c) [Mail](mailto:hello@example.org)',
    '[Anchor](#usage) [Root](/existing) [CDN](//example.org/image.jpg)',
    '`[Example](../render/)`',
    '',
    '```md',
    '[Example](../render/)\n![Image](./image.jpg)',
    '```',
    '',
    '    [Indented example](../render/)'
  ].join('\n')
  const output = rewriteReadmeLinks(source, options)
  assert.deepEqual(
    nodes(output, 'link').map(({ url }) => url),
    nodes(source, 'link').map(({ url }) => url)
  )
  for (const type of ['code', 'inlineCode']) {
    assert.deepEqual(
      nodes(output, type).map(({ value }) => value),
      nodes(source, type).map(({ value }) => value)
    )
  }
})

test('preserves GFM tables and rewrites links within their cells', () => {
  const output = rewriteReadmeLinks(
    '| Package | Notes |\n| --- | --- |\n| [Render](../render/) | ~~Old~~ |\n',
    options
  )
  assert.equal(nodes(output, 'table').length, 1)
  assert.equal(nodes(output, 'delete').length, 1)
  assert.equal(nodes(output, 'link')[0].url, '/packages/render')
})

test('preserves surrounding Markdown byte for byte, including multiline inline code', () => {
  const source = [
    '| Type | Package |',
    '| ---- | ------- |',
    '| `first\nsecond` | [Render](../render/) |',
    '',
    '*   Original list formatting',
    '',
    '~~~md',
    '[Untouched](../render/)',
    '~~~',
    ''
  ].join('\n')
  assert.equal(
    rewriteReadmeLinks(source, options),
    source.replace('[Render](../render/)', '[Render](/packages/render)')
  )
})

test('rewrites linked images without overlapping edits and preserves code in labels', () => {
  const output = rewriteReadmeLinks(
    '[![Example](./map.png)](../render/) [`two\nlines`](../render/)',
    options
  )
  assert.equal(
    nodes(output, 'image')[0].url,
    'https://raw.githubusercontent.com/allmaps/allmaps/develop/packages/source/map.png'
  )
  assert.deepEqual(
    nodes(output, 'link').map(({ url }) => url),
    ['/packages/render', '/packages/render']
  )
  assert.equal(nodes(output, 'inlineCode')[0].value, 'two\nlines')
})

test('preserves escaped pipes in table link labels', () => {
  const output = rewriteReadmeLinks(
    '| Package |\n| --- |\n| [Render \\| maps](../render/) |\n',
    options
  )
  assert.equal(nodes(output, 'tableCell').length, 2)
  assert.equal(nodes(output, 'link')[0].url, '/packages/render')
  assert.equal(nodes(output, 'link')[0].children[0].value, 'Render | maps')
})

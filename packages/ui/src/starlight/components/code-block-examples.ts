import georeferenceAnnotation from '../../../../../apps/docs/src/data/georeference-annotation-example.json?raw'
import { svelteExample } from './playground-usage.js'
import type { CodeBlockProps, CodeColorMode } from '../../lib/code/types.js'

export const examples = {
  'Georeference annotation': {
    title: 'georeference-annotation.json',
    downloadFilename: 'georeference-annotation.json',
    language: 'json',
    code: georeferenceAnnotation,
    mark: [
      { range: '14-19', label: 'IIIF source image' },
      { range: '21-24', label: 'Map mask' },
      { range: '29-34', label: 'Transformation' },
      { range: '36-97', label: 'Ground control points' }
    ],
    folds: [
      { startLine: 47, endLine: 96, label: 'Five more ground control points' }
    ]
  },
  'Map script': {
    title: 'map.js',
    downloadFilename: 'map.js',
    language: 'javascript',
    code: [
      "import { WarpedMapLayer } from '@allmaps/leaflet'",
      "import 'leaflet/dist/leaflet.css'",
      '',
      'const layer = new WarpedMapLayer()',
      'layer.addTo(map)'
    ].join('\n'),
    mark: [{ range: '4-5', label: 'Add the map layer' }],
    folds: [{ startLine: 1, endLine: 2, label: 'Imports' }]
  },
  TypeScript: {
    title: 'coordinates.ts',
    downloadFilename: 'coordinates.ts',
    language: 'typescript',
    code: 'type Coordinates = [number, number]\n\nconst amsterdam: Coordinates = [4.9, 52.37]',
    mark: [{ range: '3', label: 'Longitude and latitude' }],
    folds: [{ startLine: 1, endLine: 1, label: 'Coordinate type' }]
  },
  'Terminal command': {
    title: 'List IIIF image service URLs',
    downloadFilename: 'image-ids.sh',
    language: 'bash',
    code: 'allmaps annotation image-ids georeference-annotation.json',
    mark: [],
    folds: []
  }
} satisfies Record<string, CodeBlockProps>

export type CodeExample = keyof typeof examples
export const defaultExample: CodeExample = 'Georeference annotation'

export function formatCodeBlockUsage(
  selected: CodeExample = defaultExample,
  {
    showDownload = true,
    wrap = true,
    labels = true,
    fold = false,
    colorMode = 'auto'
  }: {
    showDownload?: boolean
    wrap?: boolean
    labels?: boolean
    fold?: boolean
    colorMode?: CodeColorMode
  } = {}
) {
  const example = examples[selected]
  const imports = showDownload ? 'CodeBlock, DownloadButton' : 'CodeBlock'
  const script = [
    `import { ${imports} } from '@allmaps/ui/code'`,
    `import code from './${example.downloadFilename}?raw'`
  ]
  const attributes = [
    '{code}',
    `language="${example.language}"`,
    `title="${example.title}"`
  ]
  if (colorMode !== 'auto') attributes.push(`colorMode="${colorMode}"`)
  if (!wrap) attributes.push('wrap={false}')
  if (labels && example.mark.length)
    attributes.push(`mark={${JSON.stringify(example.mark)}}`)
  if (fold && example.folds.length)
    attributes.push(`folds={${JSON.stringify(example.folds)}}`)
  const start = `<CodeBlock\n  ${attributes.join('\n  ')}`
  return svelteExample(
    script,
    showDownload
      ? `${start}\n>\n  {#snippet headerActions()}\n    <DownloadButton text={code} filename="${example.downloadFilename}" />\n  {/snippet}\n</CodeBlock>`
      : `${start}\n/>`
  )
}

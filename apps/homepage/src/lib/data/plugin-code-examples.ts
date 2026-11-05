import { exampleCode } from '@allmaps/ui/examples/source'
import type { CodeFold } from '@allmaps/ui/code'

export const holyokeAnnotationUrl =
  'https://annotations.allmaps.org/manifests/071c6ba31f9c88d4'

export function createMaplibreExample(annotationUrl: string) {
  const example = exampleCode(
    { annotationUrl },
    'MapLibre',
    'maplibre-gl @allmaps/maplibre'
  )
  const folds: CodeFold[] = [
    {
      startLine: 1,
      endLine: example.javascript
        .split('\n')
        .findIndex((line) => line.startsWith('const map = ')),
      label: 'Imports and worker setup'
    }
  ]

  return { ...example, folds }
}

import type { Snippet } from 'svelte'
import type { CodeThemeConfig, RenderedCodeBlock } from '../code/types.js'
import type { FetchFn } from '@allmaps/types'
import type { WarpedMapList } from '@allmaps/render'
import type { WebGL2WarpedMap } from '@allmaps/render/webgl2'

export type ExampleTransformation =
  'annotation' | 'polynomial1' | 'helmert' | 'thinPlateSpline'

export type ExampleBounds = [number, number, number, number]
export type ExampleViewMode = 'fit' | 'bounds' | 'list'
export type ExampleInitialView = {
  bounds?: ExampleBounds
  warpedMapList?: WarpedMapList<WebGL2WarpedMap>
}

export type ExampleSettings = {
  annotationUrl: string
  opacity: number
  transformation: ExampleTransformation
}

export type ExampleRenderer = EventTarget & {
  tileCache: EventTarget
}

export type ExampleMap = {
  ready: Promise<void>
  renderer?: ExampleRenderer
  warpedMapLayer: {
    addGeoreferenceAnnotation: (
      annotation: unknown,
      mapOptions?: { fetchFn?: FetchFn }
    ) => {
      ok: boolean
      error?: Error
    }[]
    setOpacity: (opacity: number) => void
    setLayerTransformationType: (
      transformation: Exclude<ExampleTransformation, 'annotation'>
    ) => void
    resetLayerOptions: (keys: string[]) => void
  }
  fitBounds: () => void
  getBounds: () => ExampleBounds | undefined
  destroy: () => void
}

export type MapExampleOption = {
  label: string
  annotationUrl: string
}

export type MapExampleProps = Partial<ExampleSettings> & {
  annotationUrl: string
  height?: number
  examples?: MapExampleOption[]
  viewMode?: ExampleViewMode
  bounds?: ExampleBounds
  codeTheme?: CodeThemeConfig
  initialCode?: Record<keyof ExampleCode, RenderedCodeBlock>
  /** Override source presentation with a snippet receiving the updated code. */
  children?: Snippet<[ExampleCode]>
}
export type ExampleLibrary = 'MapLibre' | 'Leaflet' | 'OpenLayers'

export type MapExampleSwitcherProps = MapExampleProps & {
  library?: ExampleLibrary
}

export type ExampleCode = {
  javascript: string
  html: string
  bash: string
}

export type MapExampleImplementationProps = MapExampleProps & {
  library: ExampleLibrary
  packages: string
  createExample: (
    container: HTMLElement,
    signal: AbortSignal,
    view: ExampleInitialView
  ) => Promise<ExampleMap>
}

import type { Snippet } from 'svelte'
import type { CodeThemeConfig, RenderedCodeBlock } from '@allmaps/ui/code'
import type {
  ExampleBounds,
  ExampleCode,
  ExampleCodeOptions,
  ExampleImplementation,
  ExampleLibrary
} from '@allmaps/ui/examples/source'

export type * from '@allmaps/ui/examples/source'

export type MapExampleOption = {
  label: string
  annotationUrl: string
}

export type MapExampleProps = ExampleCodeOptions & {
  examples?: MapExampleOption[]
  bounds?: ExampleBounds
  codeTheme?: CodeThemeConfig
  initialCode?: Record<keyof ExampleCode, RenderedCodeBlock>
  /** Override source presentation with a snippet receiving the updated code. */
  children?: Snippet<[ExampleCode]>
}

export type MapExampleSwitcherProps = MapExampleProps & {
  library?: ExampleLibrary
}

export type MapExampleImplementationProps = MapExampleProps & {
  library: ExampleLibrary
} & ExampleImplementation

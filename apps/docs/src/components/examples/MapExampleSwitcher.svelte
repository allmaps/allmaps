<script lang="ts">
  import MapExample from './MapExampleWithCode.svelte'
  import { exampleLibraries } from '@allmaps/ui/examples/source'
  import type {
    ExampleLibrary,
    MapExampleSwitcherProps
  } from '../../lib/examples/types.js'

  let {
    library = $bindable<ExampleLibrary>('MapLibre'),
    annotationUrl = $bindable(),
    opacity = $bindable(1),
    transformation = $bindable('annotation'),
    viewMode = $bindable('fit'),
    ...props
  }: MapExampleSwitcherProps = $props()

  const libraries = Object.keys(exampleLibraries) as ExampleLibrary[]
  const id = $props.id()

  function handleTabKeydown(event: KeyboardEvent, index: number) {
    let nextIndex: number
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % libraries.length
    else if (event.key === 'ArrowLeft')
      nextIndex = (index - 1 + libraries.length) % libraries.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = libraries.length - 1
    else return

    event.preventDefault()
    library = libraries[nextIndex]
    const button = event.currentTarget as HTMLButtonElement
    button.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus()
  }
</script>

<div
  class="[--example-panel-radius:0_0_14px_14px] [--example-panel-top-border:0]"
>
  <div
    class="flex overflow-hidden border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-[14px_14px_0_0] bg-[color:var(--sl-color-bg,#fff)]"
    role="tablist"
    aria-label="Mapping library"
  >
    {#each libraries as option, index (option)}
      <button
        class="relative flex-1 min-w-0 py-3 px-2 border-0 bg-[color:transparent] text-[color:var(--sl-color-gray-3,#495c62)] [font-family:inherit] [font-weight:inherit] [line-height:inherit] text-sm cursor-pointer hover:bg-[color:color-mix(in_srgb,var(--sl-color-text,#182a2f)_5%,var(--sl-color-bg,#fff))] aria-selected:text-[color:var(--sl-color-text,#182a2f)] aria-selected:font-semibold focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--sl-color-accent,#ff56ba)] focus-visible:outline-offset-[-3px] [&[aria-selected='true']::after]:[content:''] [&[aria-selected='true']::after]:absolute [&[aria-selected='true']::after]:bottom-0 [&[aria-selected='true']::after]:left-[20%] [&[aria-selected='true']::after]:right-[20%] [&[aria-selected='true']::after]:h-[2px] [&[aria-selected='true']::after]:bg-[color:#ff56ba]"
        type="button"
        role="tab"
        id={`${id}-${option}`}
        aria-selected={library === option}
        aria-controls={`${id}-panel`}
        tabindex={library === option ? 0 : -1}
        onkeydown={(event) => handleTabKeydown(event, index)}
        onclick={() => (library = option)}>{option}</button
      >
    {/each}
  </div>

  <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${library}`}>
    <MapExample
      {...props}
      {library}
      {...exampleLibraries[library]}
      bind:annotationUrl
      bind:opacity
      bind:transformation
      bind:viewMode
    />
  </div>
</div>

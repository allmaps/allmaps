<script lang="ts">
  import MapExample from './MapExampleWithCode.svelte'
  import { exampleLibraries } from '../../examples/libraries.js'
  import type {
    ExampleLibrary,
    MapExampleSwitcherProps
  } from '../../examples/types.js'

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

<div class="example-switcher">
  <div class="library-selector" role="tablist" aria-label="Mapping library">
    {#each libraries as option, index (option)}
      <button
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

<style>
  .example-switcher {
    --example-panel-radius: 0 0 14px 14px;
    --example-panel-top-border: 0;
  }
  .library-selector {
    display: flex;
    overflow: hidden;
    border: 1px solid var(--sl-color-gray-5, #bac4c8);
    border-radius: 14px 14px 0 0;
    background: var(--sl-color-bg, #fff);
  }
  button {
    position: relative;
    flex: 1;
    min-width: 0;
    padding: 0.75rem 0.5rem;
    border: 0;
    background: transparent;
    color: var(--sl-color-gray-3, #495c62);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  button:hover {
    background: color-mix(
      in srgb,
      var(--sl-color-text, #182a2f) 5%,
      var(--sl-color-bg, #fff)
    );
  }
  button[aria-selected='true'] {
    color: var(--sl-color-text, #182a2f);
    font-weight: 600;
  }
  button[aria-selected='true']::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 2px;
    background: #ff56ba;
  }
  button:focus-visible {
    outline: 2px solid var(--sl-color-accent, #ff56ba);
    outline-offset: -3px;
  }
</style>

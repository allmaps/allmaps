<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import { black, white } from '@allmaps/tailwind'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import {
    backgroundColors,
    backgroundLabels,
    backgroundOptions
  } from './playground-backgrounds.js'

  const storageKey = 'allmaps.ui.playground.background'
  let background = $state('white')

  onMount(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && backgroundOptions.includes(saved)) background = saved
    } catch {
      // The picker still works if the browser disallows storage.
    }
  })

  function setBackground(value: string) {
    background = value
    try {
      localStorage.setItem(storageKey, value)
    } catch {
      // Keep the current preview usable when preferences cannot be saved.
    }
  }

  let { preview, controls }: { preview: Snippet; controls?: Snippet } = $props()
</script>

<div class="not-content space-y-4 font-allmaps-ui text-foreground">
  <div
    class={[
      'grid overflow-hidden rounded-xl border border-border',
      controls && 'lg:grid-cols-[minmax(0,1fr)_20rem]'
    ]}
  >
    <div
      style:background-color={backgroundColors[background]}
      style:color={background === 'theme'
        ? undefined
        : ['black', 'darkblue'].includes(background)
          ? white
          : black}
      class="flex min-h-64 min-w-0 flex-col"
    >
      <div class="flex min-w-0 flex-1 items-center justify-center px-6 py-8">
        {@render preview()}
      </div>
      <div class="self-start p-2">
        <PlaygroundSelect
          compact
          size="sm"
          label="Preview background"
          options={backgroundOptions}
          labels={backgroundLabels}
          swatches={backgroundColors}
          bind:value={() => background, setBackground}
        />
      </div>
    </div>
    {#if controls}
      <div
        class="grid gap-4 border-t border-border p-6 sm:grid-cols-2 lg:grid-cols-1 lg:border-t-0 lg:border-l"
      >
        {@render controls()}
      </div>
    {/if}
  </div>
</div>

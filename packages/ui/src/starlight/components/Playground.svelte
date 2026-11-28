<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import { black, white } from '@allmaps/tailwind'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  import {
    backgroundColors,
    backgroundLabels,
    backgroundOptions,
    backgroundStorageKey
  } from './playground-backgrounds.js'

  import { playgroundUsage } from './playground-usage.js'

  let background = $state('white')

  onMount(() => {
    const saved = document.documentElement.dataset.playgroundBackground
    if (saved && backgroundOptions.includes(saved)) background = saved
  })

  function setBackground(value: string) {
    background = value
    document.documentElement.dataset.playgroundBackground = value
    try {
      localStorage.setItem(backgroundStorageKey, value)
    } catch {
      // Keep the current preview usable when preferences cannot be saved.
    }
  }

  let {
    preview,
    controls,
    secondColumn,
    usage
  }: {
    preview: Snippet
    controls?: Snippet
    secondColumn?: Snippet
    usage?: string
  } = $props()

  $effect(() => {
    if (usage !== undefined) playgroundUsage.set(usage)
  })
</script>

<div class="not-content space-y-4 font-allmaps-ui text-foreground">
  <div class="overflow-hidden rounded-xl border border-border">
    <div
      style:background-color={`var(--playground-background, ${white})`}
      style:color={`var(--playground-foreground, ${black})`}
      class="flex min-h-64 min-w-0 flex-col"
    >
      <div
        data-ui-preview
        class="flex min-w-0 flex-1 items-center justify-center px-6 py-8"
      >
        {@render preview()}
      </div>
      <div class="self-start p-2">
        <PlaygroundSelect
          compact
          label="Background color"
          options={backgroundOptions}
          labels={backgroundLabels}
          swatches={backgroundColors}
          bind:value={() => background, setBackground}
        />
      </div>
    </div>
    {#if controls}
      <div class="@container border-t border-border p-6">
        <div
          class={[
            'grid items-start gap-x-8 gap-y-3',
            secondColumn && '@md:grid-cols-2'
          ]}
        >
          <div class="flex min-w-0 max-w-xs flex-col items-start gap-3">
            {@render controls()}
          </div>
          {#if secondColumn}
            <div class="flex min-w-0 max-w-xs flex-col items-start gap-3">
              {@render secondColumn()}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

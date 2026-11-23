<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte'
  import { Button } from '$lib/button.js'
  import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon'
  import FloppyDiskIcon from 'phosphor-svelte/lib/FloppyDiskIcon'
  import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon'
  import SquaresFourIcon from 'phosphor-svelte/lib/SquaresFourIcon'
  import { variants } from './button-options.js'

  let showGrid = $state(false)
  let saving = $state(false)
  let saveTimer: ReturnType<typeof setTimeout>

  function previewSave(event: SubmitEvent) {
    event.preventDefault()
    saving = true
    saveTimer = setTimeout(() => (saving = false), 1500)
  }

  onDestroy(() => clearTimeout(saveTimer))
</script>

{#snippet row(id: string, label: string, buttons: Snippet)}
  <div
    {id}
    class="grid items-center gap-3 px-5 py-5 sm:grid-cols-[6rem_1fr] sm:gap-5"
  >
    <dt class="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd class="m-0 flex flex-wrap items-center gap-2">{@render buttons()}</dd>
  </div>
{/snippet}

<dl
  class="not-content m-0 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background font-allmaps-ui text-foreground"
>
  {#snippet appearances()}
    {#each variants as variant (variant)}
      <Button {variant} class="capitalize">{variant}</Button>
    {/each}
  {/snippet}
  {@render row('variants', 'Variants', appearances)}

  {#snippet navigation()}
    <Button href="/components/allmaps-logo">
      {#snippet icon()}<GlobeIcon class="size-5" />{/snippet}
      Allmaps logo
    </Button>
    <Button href="/components/modal" iconPosition="trailing">
      {#snippet icon()}<ArrowRightIcon class="size-5" />{/snippet}
      Modal
    </Button>
    <Button
      href="/"
      iconOnly
      shape="pill"
      aria-label="Component index"
      title="Component index"
    >
      {#snippet icon()}<SquaresFourIcon class="size-5" />{/snippet}
    </Button>
  {/snippet}
  {@render row('icons', 'Icon placement', navigation)}

  {#snippet states()}
    <form class="m-0" onsubmit={previewSave}>
      <Button variant="primary" type="submit" loading={saving}>
        {#snippet icon()}<FloppyDiskIcon class="size-5" />{/snippet}
        {saving ? 'Saving…' : 'Save map'}
      </Button>
    </form>
    <Button
      active={showGrid}
      aria-pressed={showGrid}
      onclick={() => (showGrid = !showGrid)}
    >
      {#snippet icon()}<SquaresFourIcon class="size-5" />{/snippet}
      Show grid
    </Button>
    <Button disabled>Disabled</Button>
  {/snippet}
  {@render row('behavior', 'States', states)}
</dl>
